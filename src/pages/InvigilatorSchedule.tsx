import React, { useState } from 'react'
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Drawer,
  Descriptions,
  Statistic,
  Progress,
  Empty,
  Tabs,
  Avatar,
} from 'antd'
import {
  TeamOutlined,
  ThunderboltOutlined,
  SwapOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  ClockCircleOutlined,
  StarOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import { generateInvigilationSchedule, type SchedulingResult } from '@/algorithms/invigilatorSchedule'
import type { InvigilationSchedule as ScheduleType, Invigilator, ApprovalStatus } from '@/types'

const { Option } = Select

const InvigilatorSchedulePage: React.FC = () => {
  const {
    invigilators,
    schedules,
    arrangements,
    examSites,
    examSubjects,
    addSchedule,
    updateSchedule,
    addApproval,
    currentUser,
  } = useAppStore()

  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleType | null>(null)
  const [previewResult, setPreviewResult] = useState<SchedulingResult | null>(null)
  const [adjustForm] = Form.useForm()
  const [form] = Form.useForm()

  const handleGenerate = async () => {
    const values = await form.validateFields()
    setIsGenerateOpen(true)
    setTimeout(() => {
      const result = generateInvigilationSchedule(
        invigilators,
        arrangements,
        examSites,
        examSubjects,
        {
          maxDailyWorkHours: values.maxDailyWorkHours,
          maxWeeklyWorkHours: values.maxWeeklyWorkHours,
          fairRotation: values.fairRotation,
          requireSubjectQualification: values.requireSubjectQualification,
          minRestHours: values.minRestHours,
        }
      )
      setPreviewResult(result)
      message.success(`排班完成：安排 ${result.stats.assignedCount} 个班次`)
      if (result.warnings.length > 0) {
        message.warning(`存在 ${result.warnings.length} 条警告`)
      }
    }, 1500)
  }

  const handleApplyResult = () => {
    if (previewResult) {
      previewResult.schedules.forEach((s) => addSchedule(s))
      message.success(`已应用 ${previewResult.schedules.length} 个排班`)
      setIsGenerateOpen(false)
      setPreviewResult(null)
    }
  }

  const handleAdjust = (schedule: ScheduleType) => {
    setSelectedSchedule(schedule)
    adjustForm.setFieldsValue({
      newInvigilatorId: '',
      reason: '',
    })
    setIsAdjustOpen(true)
  }

  const confirmAdjust = async () => {
    const values = await adjustForm.validateFields()
    if (selectedSchedule) {
      updateSchedule(selectedSchedule.id, { status: 'adjusting' })
      addApproval({
        type: 'schedule',
        targetId: selectedSchedule.id,
        title: `调班申请 - ${selectedSchedule.id.slice(0, 8)}`,
        description: `原监考更换申请：${values.reason || '未填写理由'}，替换为新监考ID: ${values.newInvigilatorId.slice(0, 8)}`,
        proposer: currentUser.name,
        proposerRole: currentUser.role,
      })
      message.success('调班申请已提交，等待考务组长审批')
      setIsAdjustOpen(false)
      setSelectedSchedule(null)
    }
  }

  const invigilatorColumns = [
    {
      title: '姓名',
      dataIndex: 'name',
      width: 100,
      render: (name: string, record: Invigilator) => (
        <Space>
          <Avatar icon={<UserOutlined />} size={32} />
          <div>
            <div style={{ fontWeight: 500 }}>{name}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{record.phone}</div>
          </div>
        </Space>
      ),
    },
    {
      title: '资质科目',
      dataIndex: 'qualifiedSubjects',
      width: 200,
      render: (ids: string[]) =>
        ids.map((id) => {
          const s = examSubjects.find((x) => x.id === id)
          return s ? <Tag key={id}>{s.name}</Tag> : null
        }),
    },
    { title: '所属区域', dataIndex: 'region', width: 100 },
    {
      title: '本周工时',
      key: 'hours',
      width: 160,
      render: (_: any, record: Invigilator) => (
        <div>
          <Progress
            percent={Math.round((record.workHours / record.maxWorkHours) * 100)}
            size="small"
            format={() => `${record.workHours}/${record.maxWorkHours}h`}
          />
        </div>
      ),
    },
    {
      title: '轮换评分',
      key: 'rotation',
      width: 100,
      render: (_: any, record: Invigilator) => (
        <Space>
          <StarOutlined style={{ color: '#faad14' }} />
          {(record.fairRotationScore * 100).toFixed(0)}
        </Space>
      ),
    },
    {
      title: '监考次数',
      dataIndex: 'pastInvigilationCount',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: Invigilator['status']) => {
        const map = {
          available: { color: 'green', text: '可用' },
          assigned: { color: 'blue', text: '已排班' },
          leave: { color: 'orange', text: '请假' },
        }
        return <Tag color={map[status].color}>{map[status].text}</Tag>
      },
    },
  ]

  const scheduleColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      width: 110,
    },
    {
      title: '时段',
      dataIndex: 'shift',
      width: 80,
      render: (shift: ScheduleType['shift']) => (
        <Tag color={{ morning: 'blue', afternoon: 'orange', evening: 'purple' }[shift]}>
          {{ morning: '上午', afternoon: '下午', evening: '晚上' }[shift]}
        </Tag>
      ),
    },
    {
      title: '监考老师',
      dataIndex: 'invigilatorId',
      width: 140,
      render: (id: string) => {
        const inv = invigilators.find((i) => i.id === id)
        return inv ? (
          <Space>
            <Avatar size={24} icon={<UserOutlined />} />
            {inv.name}
          </Space>
        ) : '-'
      },
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 80,
      render: (role: ScheduleType['role']) => (
        <Tag color={role === 'lead' ? 'blue' : 'cyan'}>
          {role === 'lead' ? '主监考' : '副监考'}
        </Tag>
      ),
    },
    {
      title: '考场',
      dataIndex: 'examRoomId',
      width: 180,
      render: (rid: string) => {
        const site = examSites.find((s) => s.rooms.some((r) => r.id === rid))
        const room = site?.rooms.find((r) => r.id === rid)
        return (
          <div>
            <div style={{ fontSize: 12 }}>{site?.name}</div>
            <div style={{ color: '#888', fontSize: 11 }}>{room?.name}</div>
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
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: ScheduleType['status']) => {
        const map = {
          scheduled: { color: 'green', text: '已排定' },
          adjusting: { color: 'orange', text: '调班中' },
          completed: { color: 'blue', text: '已完成' },
        }
        return <Tag color={map[status].color}>{map[status].text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, record: ScheduleType) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleAdjust(record)}>
            申请调班
          </Button>
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
              title="监考人员"
              value={invigilators.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已排班次"
              value={schedules.length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="主监考"
              value={schedules.filter((s) => s.role === 'lead').length}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="调班申请中"
              value={schedules.filter((s) => s.status === 'adjusting').length}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="监考排班管理"
        extra={
          <Button type="primary" icon={<ThunderboltOutlined />} onClick={handleGenerate}>
            智能排班
          </Button>
        }
      >
        <Tabs
          items={[
            {
              key: 'schedules',
              label: '排班表',
              children:
                schedules.length > 0 ? (
                  <Table
                    columns={scheduleColumns}
                    dataSource={schedules}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                  />
                ) : (
                  <Empty description="暂无排班，请点击智能排班前先生成" style={{ padding: 60 }} />
                ),
            },
            {
              key: 'invigilators',
              label: '监考人员库',
              children: (
                <Table
                  columns={invigilatorColumns}
                  dataSource={invigilators}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="智能排班参数设置"
        open={isGenerateOpen && !previewResult}
        onOk={() => handleGenerate()}
        onCancel={() => setIsGenerateOpen(false)}
        okText="开始排班"
        width={520}
      >
        <Form form={form} layout="vertical" initialValues={{
          maxDailyWorkHours: 8,
          maxWeeklyWorkHours: 48,
          fairRotation: true,
          requireSubjectQualification: true,
          minRestHours: 4,
        }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="日最大工时(h)" name="maxDailyWorkHours">
                <Select>
                  {[4, 6, 8, 10].map((h) => (
                    <Option key={h} value={h}>{h}小时</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="周最大工时(h)" name="maxWeeklyWorkHours">
                <Select>
                  {[24, 32, 40, 48, 56].map((h) => (
                    <Option key={h} value={h}>{h}小时</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="公平轮换（综合考虑历史监考次数和轮换评分）" name="fairRotation" valuePropName="checked">
            <Select>
              <Option value={true}>启用</Option>
              <Option value={false}>禁用</Option>
            </Select>
          </Form.Item>
          <Form.Item label="要求科目资质匹配" name="requireSubjectQualification" valuePropName="checked">
            <Select>
              <Option value={true}>启用</Option>
              <Option value={false}>禁用</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="排班结果预览"
        open={isGenerateOpen && !!previewResult}
        onOk={handleApplyResult}
        onCancel={() => {
          setIsGenerateOpen(false)
          setPreviewResult(null)
        }}
        okText="应用排班结果"
        width={800}
      >
        {previewResult && (
          <>
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small"><Statistic title="总班次" value={previewResult.stats.totalSlots} /></Card>
              </Col>
              <Col span={6}>
                <Card size="small"><Statistic title="已安排" value={previewResult.stats.assignedCount} valueStyle={{ color: '#52c41a' }} /></Card>
              </Col>
              <Col span={6}>
                <Card size="small"><Statistic title="主监考" value={previewResult.stats.leadCount} /></Card>
              </Col>
              <Col span={6}>
                <Card size="small"><Statistic title="副监考" value={previewResult.stats.assistantCount} /></Card>
              </Col>
            </Row>
            {previewResult.warnings.length > 0 && (
              <div style={{ margin: '16px 0', padding: 12, background: '#fffbe6', borderRadius: 4 }}>
                <div style={{ fontWeight: 500, color: '#fa8c16', marginBottom: 8 }}>
                  ⚠️ 警告信息 ({previewResult.warnings.length})
                </div>
                {previewResult.warnings.slice(0, 5).map((w, idx) => (
                  <div key={idx} style={{ color: '#666', fontSize: 12 }}>• {w}</div>
                ))}
              </div>
            )}
            <Table
              size="small"
              columns={[
                { title: '日期', dataIndex: 'date', width: 100 },
                {
                  title: '时段',
                  dataIndex: 'shift',
                  render: (s: string) => ({ morning: '上午', afternoon: '下午', evening: '晚上' }[s as 'morning' | 'afternoon' | 'evening']),
                },
                {
                  title: '监考',
                  dataIndex: 'invigilatorId',
                  render: (id: string) => invigilators.find((i) => i.id === id)?.name || id.slice(0, 8),
                },
                { title: '角色', dataIndex: 'role', render: (r: string) => (r === 'lead' ? '主监考' : '副监考') },
              ]}
              dataSource={previewResult.schedules.slice(0, 10)}
              rowKey="id"
              pagination={false}
            />
          </>
        )}
      </Modal>

      <Modal
        title="申请调班"
        open={isAdjustOpen}
        onOk={confirmAdjust}
        onCancel={() => {
          setIsAdjustOpen(false)
          setSelectedSchedule(null)
        }}
        okText="提交申请"
      >
        {selectedSchedule && (
          <Form form={adjustForm} layout="vertical">
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }} bordered>
              <Descriptions.Item label="原监考老师">
                {invigilators.find((i) => i.id === selectedSchedule.invigilatorId)?.name}
              </Descriptions.Item>
              <Descriptions.Item label="考试日期">{selectedSchedule.date}</Descriptions.Item>
              <Descriptions.Item label="时段">
                {{ morning: '上午', afternoon: '下午', evening: '晚上' }[selectedSchedule.shift]}
              </Descriptions.Item>
              <Descriptions.Item label="科目">
                {examSubjects.find((s) => s.id === selectedSchedule.subjectId)?.name}
              </Descriptions.Item>
            </Descriptions>
            <Form.Item
              label="替换监考老师"
              name="newInvigilatorId"
              rules={[{ required: true, message: '请选择替换监考' }]}
            >
              <Select placeholder="请选择可用监考老师" showSearch optionFilterProp="children">
                {invigilators
                  .filter((i) => i.status === 'available' && i.id !== selectedSchedule.invigilatorId)
                  .map((i) => (
                    <Option key={i.id} value={i.id}>
                      {i.name} - {i.region}
                    </Option>
                  ))}
              </Select>
            </Form.Item>
            <Form.Item label="调班理由" name="reason">
              <textarea
                rows={3}
                style={{ width: '100%', padding: 8, border: '1px solid #d9d9d9', borderRadius: 4 }}
                placeholder="请说明调班理由..."
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

export default InvigilatorSchedulePage
