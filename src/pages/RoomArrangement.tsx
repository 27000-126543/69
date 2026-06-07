import React, { useState } from 'react'
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Switch,
  Slider,
  message,
  Drawer,
  Descriptions,
  Statistic,
  Divider,
  Progress,
} from 'antd'
import {
  ThunderboltOutlined,
  SendOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  SettingOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import { generateRoomArrangement, type ArrangementResult } from '@/algorithms/roomArrangement'
import type { RoomArrangement as RoomArrangementType, ApprovalStatus, Candidate } from '@/types'

const RoomArrangement: React.FC = () => {
  const {
    candidates,
    examSites,
    examSubjects,
    arrangements,
    addArrangement,
    submitArrangementForApproval,
  } = useAppStore()

  const [isSettingOpen, setIsSettingOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedArrangement, setSelectedArrangement] = useState<RoomArrangementType | null>(null)
  const [previewResult, setPreviewResult] = useState<ArrangementResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [settingsForm] = Form.useForm()

  const handleGenerate = async () => {
    const values = await settingsForm.validateFields()
    setIsGenerating(true)
    try {
      setTimeout(() => {
        const result = generateRoomArrangement(candidates, examSites, examSubjects, {
          minSeatSpacing: values.minSeatSpacing,
          avoidSameSchool: values.avoidSameSchool,
          avoidTimeConflict: values.avoidTimeConflict,
          specialAccessibility: values.specialAccessibility,
        })
        setPreviewResult(result)
        setIsPreviewOpen(true)
        setIsGenerating(false)
        message.success(`编排完成，成功安排 ${result.stats.assignedCount} 人次`)
        if (result.warnings.length > 0) {
          message.warning(`存在 ${result.warnings.length} 条警告`)
        }
      }, 1500)
    } catch {
      setIsGenerating(false)
      message.error('编排失败')
    }
  }

  const handleApplyResult = () => {
    if (previewResult) {
      previewResult.arrangements.forEach((a) => addArrangement(a))
      message.success(`已应用 ${previewResult.arrangements.length} 个编排方案`)
      setIsPreviewOpen(false)
      setPreviewResult(null)
    }
  }

  const approvalTag = (status: ApprovalStatus) => {
    const map = {
      pending: { color: 'orange', text: '待审批', icon: <ExclamationCircleOutlined /> },
      approved: { color: 'green', text: '已通过', icon: <CheckOutlined /> },
      rejected: { color: 'red', text: '已拒绝', icon: <CloseOutlined /> },
      adjusting: { color: 'blue', text: '调整中', icon: <SettingOutlined /> },
    }
    return (
      <Tag color={map[status].color} icon={map[status].icon}>
        {map[status].text}
      </Tag>
    )
  }

  const renderSeatLayout = (arrangement: RoomArrangementType) => {
    const cols = 5
    const rows = 6
    const seatMap = new Map<string, Candidate | null>()
    arrangement.assignments.forEach((a) => {
      const c = candidates.find((cc) => cc.id === a.candidateId)
      seatMap.set(`${a.row}-${a.col}`, c || null)
    })

    return (
      <div
        className="seat-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 60px)` }}
      >
        {Array.from({ length: rows * cols }, (_, idx) => {
          const row = Math.floor(idx / cols) + 1
          const col = (idx % cols) + 1
          const key = `${row}-${col}`
          const candidate = seatMap.get(key)
          let className = 'seat'
          if (candidate) {
            className += candidate.specialNeed !== 'none' ? ' special' : ' occupied'
          } else {
            className += ' empty'
          }
          return (
            <div key={key} className={className} title={candidate?.name}>
              {candidate ? (
                <TooltipLike name={candidate.name} seat={row * 10 + col} />
              ) : (
                <span style={{ fontSize: 10 }}>{row * 10 + col}</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const TooltipLike: React.FC<{ name: string; seat: number }> = ({ name, seat }) => (
    <div style={{ fontSize: 10, textAlign: 'center' }}>
      <div>{seat}</div>
      <div style={{ fontSize: 9 }}>{name.slice(0, 2)}</div>
    </div>
  )

  const columns = [
    {
      title: '考场',
      key: 'room',
      width: 180,
      render: (_: any, record: RoomArrangementType) => {
        const site = examSites.find((s) => s.rooms.some((r) => r.id === record.examRoomId))
        const room = site?.rooms.find((r) => r.id === record.examRoomId)
        return (
          <div>
            <div style={{ fontWeight: 500 }}>{site?.name}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{room?.name}</div>
          </div>
        )
      },
    },
    {
      title: '科目',
      dataIndex: 'subjectId',
      width: 120,
      render: (sid: string) => examSubjects.find((s) => s.id === sid)?.name || '-',
    },
    { title: '日期', dataIndex: 'date', width: 100 },
    {
      title: '考生数',
      dataIndex: 'assignments',
      width: 100,
      render: (assignments: any[]) => (
        <Space>
          <span>{assignments.length}</span>
          {assignments.some((a) => a.isSpecial) && (
            <Tag color="orange">特殊</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '监考人数',
      dataIndex: 'invigilators',
      width: 100,
      render: (inv: any[]) => inv.length || '待安排',
    },
    { title: '审批状态', dataIndex: 'approvalStatus', width: 120, render: approvalTag },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: any, record: RoomArrangementType) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedArrangement(record)
              setIsSettingOpen(false)
            }}
          >
            查看座位
          </Button>
          {record.approvalStatus !== 'approved' && (
            <Button
              type="link"
              size="small"
              icon={<SendOutlined />}
              onClick={() => submitArrangementForApproval(record.id)}
            >
              提交审批
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="编排方案"
              value={arrangements.length}
              valueStyle={{ color: '#1677ff' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审批"
              value={arrangements.filter((a) => a.approvalStatus === 'pending').length}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已通过"
              value={arrangements.filter((a) => a.approvalStatus === 'approved').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="特殊考生"
              value={candidates.filter((c) => c.specialNeed !== 'none').length}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="考场编排方案列表"
        extra={
          <Space>
            <Button icon={<SettingOutlined />} onClick={() => setIsSettingOpen(true)}>
              编排设置
            </Button>
            <Button type="primary" icon={<ThunderboltOutlined />} loading={isGenerating} onClick={handleGenerate}>
              智能编排
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={arrangements}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="智能编排参数设置"
        open={isSettingOpen}
        onOk={() => {
          setIsSettingOpen(false)
          handleGenerate()
        }}
        onCancel={() => setIsSettingOpen(false)}
        okText="开始编排"
        width={520}
      >
        <Form form={settingsForm} layout="vertical" initialValues={{
          minSeatSpacing: 1,
          avoidSameSchool: true,
          avoidTimeConflict: true,
          specialAccessibility: true,
        }}>
          <Form.Item label="最小座位间距（格）" name="minSeatSpacing">
            <Slider min={0} max={2} marks={{ 0: '相邻', 1: '间隔1位', 2: '间隔2位' }} />
          </Form.Item>
          <Form.Item label="同校考生避让" name="avoidSameSchool" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item label="科目时间冲突检测" name="avoidTimeConflict" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item label="特殊考生无障碍优先" name="specialAccessibility" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编排结果预览"
        open={isPreviewOpen}
        onOk={handleApplyResult}
        onCancel={() => setIsPreviewOpen(false)}
        okText="应用编排结果"
        width={800}
      >
        {previewResult && (
          <>
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="待安排考生" value={previewResult.stats.totalCandidates} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="已安排人次"
                    value={previewResult.stats.assignedCount}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="特殊考生"
                    value={previewResult.stats.specialAssignedCount}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="编排方案数"
                    value={previewResult.arrangements.length}
                    valueStyle={{ color: '#1677ff' }}
                  />
                </Card>
              </Col>
            </Row>
            <Progress
              percent={Math.round((previewResult.stats.assignedCount / (previewResult.stats.totalCandidates || 1)) * 100)}
              style={{ marginTop: 16 }}
            />
            <Divider />
            {previewResult.warnings.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 500, color: '#fa8c16', marginBottom: 8 }}>
                  ⚠️ 警告信息 ({previewResult.warnings.length})
                </div>
                {previewResult.warnings.slice(0, 5).map((w, idx) => (
                  <div key={idx} style={{ color: '#666', fontSize: 12, padding: '4px 0' }}>
                    • {w}
                  </div>
                ))}
                {previewResult.warnings.length > 5 && (
                  <div style={{ color: '#888', fontSize: 12 }}>... 还有 {previewResult.warnings.length - 5} 条</div>
                )}
              </div>
            )}
            <Table
              size="small"
              columns={[
                { title: '考场ID', dataIndex: 'examRoomId', render: (v: string) => v.slice(0, 8) },
                {
                  title: '科目',
                  dataIndex: 'subjectId',
                  render: (sid: string) => examSubjects.find((s) => s.id === sid)?.name,
                },
                { title: '考生数', dataIndex: 'assignments', render: (a: any[]) => a.length },
              ]}
              dataSource={previewResult.arrangements}
              rowKey="id"
              pagination={{ pageSize: 5 }}
            />
          </>
        )}
      </Modal>

      <Drawer
        title="考场座位布局详情"
        placement="right"
        width={560}
        open={!!selectedArrangement}
        onClose={() => setSelectedArrangement(null)}
      >
        {selectedArrangement && (
          <>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }} bordered>
              <Descriptions.Item label="考场">
                {examSites.find((s) => s.rooms.some((r) => r.id === selectedArrangement.examRoomId))?.name}
              </Descriptions.Item>
              <Descriptions.Item label="科目">
                {examSubjects.find((s) => s.id === selectedArrangement.subjectId)?.name}
              </Descriptions.Item>
              <Descriptions.Item label="考生数">{selectedArrangement.assignments.length}</Descriptions.Item>
              <Descriptions.Item label="审批状态">
                {approvalTag(selectedArrangement.approvalStatus)}
              </Descriptions.Item>
              {selectedArrangement.approvalComment && (
                <Descriptions.Item label="审批意见">
                  <Tag color={selectedArrangement.approvalStatus === 'approved' ? 'green' : 'red'}>
                    {selectedArrangement.approvalComment}
                  </Tag>
                </Descriptions.Item>
              )}
              {selectedArrangement.approvedBy && (
                <>
                  <Descriptions.Item label="审批人">{selectedArrangement.approvedBy}</Descriptions.Item>
                  <Descriptions.Item label="审批时间">
                    {selectedArrangement.approvedAt
                      ? new Date(selectedArrangement.approvedAt).toLocaleString('zh-CN')
                      : '-'}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
            <Divider>座位分布图</Divider>
            <div style={{ textAlign: 'center', padding: 16, background: '#fafafa', borderRadius: 8 }}>
              <div style={{ marginBottom: 16, fontWeight: 500 }}>—— 讲台 ——</div>
              {renderSeatLayout(selectedArrangement)}
              <div style={{ marginTop: 16, fontSize: 12, color: '#888' }}>
                <Space>
                  <span className="seat occupied" style={{ display: 'inline-block', width: 20, height: 20 }}></span> 普通考生
                  <span className="seat special" style={{ display: 'inline-block', width: 20, height: 20 }}></span> 特殊考生
                  <span className="seat empty" style={{ display: 'inline-block', width: 20, height: 20 }}></span> 空座
                </Space>
              </div>
            </div>
            <Divider>考生列表</Divider>
            <Table
              size="small"
              dataSource={selectedArrangement.assignments}
              rowKey="id"
              columns={[
                { title: '座位号', dataIndex: 'seatNumber', width: 80 },
                {
                  title: '考生',
                  dataIndex: 'candidateId',
                  render: (cid: string) => {
                    const c = candidates.find((cc) => cc.id === cid)
                    return c ? (
                      <Space>
                        <AvatarLike name={c.name} />
                        <span>{c.name}</span>
                        {c.specialNeed !== 'none' && <Tag color="orange">特殊</Tag>}
                      </Space>
                    ) : '-'
                  },
                },
                { title: '坐标', render: (_: any, r: any) => `${r.row}排${r.col}列` },
              ]}
              pagination={false}
            />
          </>
        )}
      </Drawer>
    </div>
  )
}

const AvatarLike: React.FC<{ name: string }> = ({ name }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#1677ff',
    color: '#fff',
    fontSize: 12,
  }}>
    <UserOutlined />
  </span>
)

export default RoomArrangement
