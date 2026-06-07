import React, { useState, useMemo } from 'react'
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
  InputNumber,
  Select,
  message,
  Drawer,
  Descriptions,
  Statistic,
  Tabs,
  Alert,
  Empty,
  Progress,
} from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  EditOutlined,
  SearchOutlined,
  ExportOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import { crossValidateScores, detectScoreAbnormalities } from '@/algorithms/anomalyDetection'
import type { Score, ScoreStatus } from '@/types'
import { exportScoresToExcel } from '@/utils/exporters'
import dayjs from 'dayjs'

const { Option } = Select

const ScoreManagement: React.FC = () => {
  const {
    scores,
    candidates,
    examSubjects,
    currentUser,
    addScore,
    updateScore,
    verifyScore,
  } = useAppStore()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isVerifyOpen, setIsVerifyOpen] = useState(false)
  const [selectedScore, setSelectedScore] = useState<Score | null>(null)
  const [filterSubject, setFilterSubject] = useState<string | undefined>()
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [onlyAbnormal, setOnlyAbnormal] = useState(false)
  const [form] = Form.useForm()

  const filteredScores = useMemo(() => {
    return scores.filter((s) => {
      if (filterSubject && s.subjectId !== filterSubject) return false
      if (filterStatus && s.status !== filterStatus) return false
      if (onlyAbnormal && !s.isAbnormal) return false
      return true
    })
  }, [scores, filterSubject, filterStatus, onlyAbnormal])

  const abnormalCount = scores.filter((s) => s.isAbnormal).length
  const verifiedCount = scores.filter((s) => s.status === 'verified' || s.status === 'finalized').length

  const handleAdd = () => {
    form.resetFields()
    setIsAddOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const candidate = candidates.find((c) => c.id === values.candidateId)
      if (!candidate || !candidate.subjects.includes(values.subjectId)) {
        message.error('该考生未报考此科目')
        return
      }

      const existingScore = scores.find(
        (s) => s.candidateId === values.candidateId && s.subjectId === values.subjectId
      )
      if (existingScore) {
        message.error('该考生该科目已有成绩记录')
        return
      }

      const crossValidation = {
        secondScore: values.secondScore,
        secondEnteredBy: '系统模拟',
        difference: Math.abs(values.score - values.secondScore),
        passed: Math.abs(values.score - values.secondScore) <= 3,
      }

      const isAbnormal =
        !crossValidation.passed ||
        values.score < 30 ||
        values.score > 95 ||
        values.secondScore < 30 ||
        values.secondScore > 95

      let abnormalReason: string | undefined
      if (!crossValidation.passed) abnormalReason = '两位阅卷老师分数差异过大'
      else if (values.score < 30 || values.secondScore < 30) abnormalReason = '异常低分'
      else if (values.score > 95 || values.secondScore > 95) abnormalReason = '异常高分'

      addScore({
        candidateId: values.candidateId,
        subjectId: values.subjectId,
        score: values.score,
        enteredBy: currentUser.name,
        status: isAbnormal ? 'abnormal' : 'draft',
        isAbnormal,
        abnormalReason,
        crossValidation,
      })
      message.success('成绩录入成功')
      setIsAddOpen(false)
    } catch {
      message.error('请检查表单填写')
    }
  }

  const handleVerify = (score: Score) => {
    setSelectedScore(score)
    setIsVerifyOpen(true)
  }

  const confirmVerify = () => {
    if (selectedScore) {
      if (selectedScore.crossValidation && !selectedScore.crossValidation.passed) {
        message.error('交叉验证未通过，无法标记为已验证')
        return
      }
      if (selectedScore.isAbnormal) {
        message.error('存在异常标记，请先处理异常')
        return
      }
      verifyScore(selectedScore.id, currentUser.name)
      message.success('成绩验证通过')
      setIsVerifyOpen(false)
      setSelectedScore(null)
    }
  }

  const statusTag = (status: ScoreStatus) => {
    const map: Record<ScoreStatus, { color: string; text: string }> = {
      draft: { color: 'default', text: '待确认' },
      verified: { color: 'blue', text: '已验证' },
      abnormal: { color: 'red', text: '异常待复核' },
      finalized: { color: 'green', text: '已定档' },
    }
    return <Tag color={map[status].color}>{map[status].text}</Tag>
  }

  const columns = [
    {
      title: '考生',
      dataIndex: 'candidateId',
      width: 160,
      render: (cid: string) => {
        const c = candidates.find((cc) => cc.id === cid)
        return c ? (
          <Space>
            <AvatarSmall name={c.name} />
            <div>
              <div style={{ fontWeight: 500 }}>{c.name}</div>
              <div style={{ color: '#888', fontSize: 11 }}>{c.idCard}</div>
            </div>
          </Space>
        ) : '-'
      },
    },
    {
      title: '科目',
      dataIndex: 'subjectId',
      width: 120,
      render: (sid: string) => examSubjects.find((s) => s.id === sid)?.name || '-',
    },
    {
      title: '初评分数',
      dataIndex: 'score',
      width: 100,
      render: (v: number) => <strong style={{ fontSize: 16 }}>{v}</strong>,
    },
    {
      title: '复评分数',
      key: 'secondScore',
      width: 100,
      render: (_: any, record: Score) => (
        <span>
          {record.crossValidation?.secondScore ?? '-'}
          {record.crossValidation && (
            <Tag color={record.crossValidation.passed ? 'green' : 'red'} style={{ marginLeft: 8 }}>
              差{record.crossValidation.difference}分
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: '异常标记',
      dataIndex: 'isAbnormal',
      width: 120,
      render: (v: boolean, record: Score) =>
        v ? (
          <Tag color="red" icon={<WarningOutlined />}>
            {record.abnormalReason || '异常'}
          </Tag>
        ) : (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            正常
          </Tag>
        ),
    },
    { title: '状态', dataIndex: 'status', width: 120, render: statusTag },
    {
      title: '录入人',
      dataIndex: 'enteredBy',
      width: 100,
    },
    {
      title: '录入时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Score) => (
        <Space>
          <Button type="link" size="small" onClick={() => setSelectedScore(record)}>
            详情
          </Button>
          {record.status === 'draft' && record.crossValidation?.passed && !record.isAbnormal && (
            <Button
              type="link"
              size="small"
              icon={<SafetyCertificateOutlined />}
              onClick={() => handleVerify(record)}
            >
              验证通过
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
              title="成绩总数"
              value={scores.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已验证"
              value={verifiedCount}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待复核异常"
              value={abnormalCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="验证通过率"
              value={scores.length > 0 ? Math.round((verifiedCount / scores.length) * 100) : 0}
              suffix="%"
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="成绩管理"
        extra={
          <Space>
            <Button icon={<ExportOutlined />} onClick={() => exportScoresToExcel(filteredScores)}>
              导出Excel
            </Button>
            <Button type="primary" icon={<FileTextOutlined />} onClick={handleAdd}>
              录入成绩
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
          <Select
            placeholder="筛选科目"
            allowClear
            style={{ width: 160 }}
            value={filterSubject}
            onChange={setFilterSubject}
          >
            {examSubjects.map((s) => (
              <Option key={s.id} value={s.id}>
                {s.name}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="筛选状态"
            allowClear
            style={{ width: 160 }}
            value={filterStatus}
            onChange={setFilterStatus}
          >
            <Option value="draft">待确认</Option>
            <Option value="verified">已验证</Option>
            <Option value="abnormal">异常待复核</Option>
            <Option value="finalized">已定档</Option>
          </Select>
          <Button
            type={onlyAbnormal ? 'primary' : 'default'}
            icon={<WarningOutlined />}
            onClick={() => setOnlyAbnormal(!onlyAbnormal)}
          >
            仅看异常
          </Button>
        </div>

        {abnormalCount > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`发现 ${abnormalCount} 条异常成绩，需要人工复核`}
            style={{ marginBottom: 16 }}
          />
        )}

        {filteredScores.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredScores}
            rowKey="id"
            scroll={{ x: 1300 }}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty description="暂无成绩记录" style={{ padding: 60 }} />
        )}
      </Card>

      <Modal
        title="录入成绩"
        open={isAddOpen}
        onOk={handleSubmit}
        onCancel={() => setIsAddOpen(false)}
        okText="提交"
        width={560}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="选择考生"
            name="candidateId"
            rules={[{ required: true, message: '请选择考生' }]}
          >
            <Select
              placeholder="搜索考生姓名或身份证"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) => {
                const c = candidates.find((cc) => cc.id === option?.value)
                return c ? c.name.includes(input) || c.idCard.includes(input) : false
              }}
            >
              {candidates.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.name} - {c.idCard}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="考试科目"
            name="subjectId"
            rules={[{ required: true, message: '请选择科目' }]}
          >
            <Select placeholder="请选择科目">
              {examSubjects.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="初评分数（阅卷老师A）"
                name="score"
                rules={[
                  { required: true, message: '请输入分数' },
                  { type: 'number', min: 0, max: 100, message: '分数范围 0-100' },
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="复评分数（阅卷老师B）"
                name="secondScore"
                rules={[
                  { required: true, message: '请输入分数' },
                  { type: 'number', min: 0, max: 100, message: '分数范围 0-100' },
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>
          <Alert
            type="info"
            showIcon
            message="交叉验证规则：两位阅卷老师分数差异 ≤ 3 分视为通过，超过则自动标记为异常待复核"
          />
        </Form>
      </Modal>

      <Modal
        title="确认验证通过"
        open={isVerifyOpen}
        onOk={confirmVerify}
        onCancel={() => {
          setIsVerifyOpen(false)
          setSelectedScore(null)
        }}
        okText="确认验证"
      >
        {selectedScore && (
          <div>
            <p>确认将以下成绩标记为已验证？</p>
            <ul>
              <li>考生: {candidates.find((c) => c.id === selectedScore.candidateId)?.name}</li>
              <li>科目: {examSubjects.find((s) => s.id === selectedScore.subjectId)?.name}</li>
              <li>初评: {selectedScore.score}分，复评: {selectedScore.crossValidation?.secondScore}分</li>
              <li>分差: {selectedScore.crossValidation?.difference}分</li>
            </ul>
          </div>
        )}
      </Modal>

      <Drawer
        title="成绩详情"
        placement="right"
        width={520}
        open={!!selectedScore && !isVerifyOpen}
        onClose={() => setSelectedScore(null)}
      >
        {selectedScore && (
          <>
            <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="考生">
                {candidates.find((c) => c.id === selectedScore.candidateId)?.name}
              </Descriptions.Item>
              <Descriptions.Item label="身份证号">
                {candidates.find((c) => c.id === selectedScore.candidateId)?.idCard}
              </Descriptions.Item>
              <Descriptions.Item label="科目">
                {examSubjects.find((s) => s.id === selectedScore.subjectId)?.name}
              </Descriptions.Item>
              <Descriptions.Item label="初评分数">
                <strong style={{ fontSize: 18 }}>{selectedScore.score}</strong> 分
              </Descriptions.Item>
              <Descriptions.Item label="初评录入人">{selectedScore.enteredBy}</Descriptions.Item>
              {selectedScore.crossValidation && (
                <>
                  <Descriptions.Item label="复评分数">
                    <strong style={{ fontSize: 18 }}>{selectedScore.crossValidation.secondScore}</strong> 分
                  </Descriptions.Item>
                  <Descriptions.Item label="分差">
                    <Tag color={selectedScore.crossValidation.passed ? 'green' : 'red'}>
                      {selectedScore.crossValidation.difference} 分
                      {selectedScore.crossValidation.passed ? ' ✓ 通过' : ' ✗ 未通过'}
                    </Tag>
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="异常标记">
                {selectedScore.isAbnormal ? (
                  <Tag color="red" icon={<WarningOutlined />}>
                    {selectedScore.abnormalReason || '异常'}
                  </Tag>
                ) : (
                  <Tag color="green" icon={<CheckCircleOutlined />}>正常</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">{statusTag(selectedScore.status)}</Descriptions.Item>
              {selectedScore.verifiedBy && (
                <>
                  <Descriptions.Item label="验证人">{selectedScore.verifiedBy}</Descriptions.Item>
                  <Descriptions.Item label="验证时间">
                    {selectedScore.verifiedAt && dayjs(selectedScore.verifiedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="录入时间">
                {dayjs(selectedScore.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="交叉验证流程">
              <Progress
                percent={
                  selectedScore.status === 'finalized'
                    ? 100
                    : selectedScore.status === 'verified'
                    ? 75
                    : selectedScore.crossValidation
                    ? 50
                    : 25
                }
                status={selectedScore.isAbnormal ? 'exception' : 'active'}
              />
              <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
                初评录入 → 复评录入 → 交叉验证 → 成绩验证 → 成绩定档
              </div>
            </Card>
          </>
        )}
      </Drawer>
    </div>
  )
}

const AvatarSmall: React.FC<{ name: string }> = ({ name }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#1677ff',
    color: '#fff',
    fontSize: 12,
  }}>
    <UserOutlined />
  </span>
)

export default ScoreManagement
