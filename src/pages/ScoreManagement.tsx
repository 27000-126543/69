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
  Input,
  message,
  Drawer,
  Descriptions,
  Statistic,
  Alert,
  Empty,
  Progress,
  List,
  Tooltip,
} from 'antd'
import {
  FileTextOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExportOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import { crossValidateScores, detectScoreAbnormalities } from '@/algorithms/anomalyDetection'
import type { Score, ScoreStatus } from '@/types'
import { exportScoresToExcel } from '@/utils/exporters'
import dayjs from 'dayjs'

const { Option } = Select

interface AbnormalScoreDetail {
  id: string
  candidateName: string
  subjectName: string
  scoreA: number
  scoreB: number
  reasons: string[]
  types: Array<'cross' | 'extreme' | 'std'>
}

const AvatarSmall: React.FC<{ name: string }> = ({ name }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: '#1677ff',
      color: '#fff',
      fontSize: 12,
    }}
  >
    <UserOutlined />
  </span>
)

const DividerLike: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      margin: '8px 0 16px 0',
      color: '#1677ff',
      fontWeight: 600,
      fontSize: 13,
    }}
  >
    <div style={{ flex: 1, height: 1, background: '#e6f4ff' }}></div>
    <span style={{ padding: '0 12px' }}>{children}</span>
    <div style={{ flex: 1, height: 1, background: '#e6f4ff' }}></div>
  </div>
)

const ScoreManagement: React.FC = () => {
  const { scores, candidates, examSubjects, currentUser, addScore, updateScore, verifyScore } =
    useAppStore()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isVerifyOpen, setIsVerifyOpen] = useState(false)
  const [selectedScore, setSelectedScore] = useState<Score | null>(null)
  const [filterSubject, setFilterSubject] = useState<string | undefined>()
  const [filterStatus, setFilterStatus] = useState<string | undefined>()
  const [onlyAbnormal, setOnlyAbnormal] = useState(false)
  const [form] = Form.useForm()

  const abnormalScoresDetail = useMemo((): AbnormalScoreDetail[] => {
    const result: AbnormalScoreDetail[] = []
    examSubjects.forEach((subject) => {
      const subjectScores = scores.filter((s) => s.subjectId === subject.id)
      const scoreAValues = subjectScores.map((s) => s.score)
      const abnormalities = detectScoreAbnormalities(
        subjectScores.map((s) => ({
          candidateId: s.candidateId,
          subjectId: s.subjectId,
          score: s.score,
        })),
        scoreAValues
      )
      const abnormalMap = new Map<string, string[]>()
      abnormalities.forEach((a) => {
        const key = `${a.candidateId}-${a.subjectId}`
        if (!abnormalMap.has(key)) abnormalMap.set(key, [])
        abnormalMap.get(key)!.push(a.reason)
      })

      subjectScores.forEach((score) => {
        const key = `${score.candidateId}-${score.subjectId}`
        const reasons: string[] = []
        const types: Array<'cross' | 'extreme' | 'std'> = []

        if (score.crossValidation && !score.crossValidation.passed) {
          reasons.push(`双评分差过大(${score.crossValidation.difference}分)`)
          types.push('cross')
        }
        if (abnormalMap.has(key)) {
          const abnReasons = abnormalMap.get(key)!
          reasons.push(...abnReasons)
          abnReasons.forEach((r) => {
            if (r.includes('标准差') || r.includes('偏离均值')) types.push('std')
            if (r.includes('高分') || r.includes('低分') || r.includes('满分') || r.includes('零分'))
              types.push('extreme')
          })
        }
        if (score.abnormalReason && !reasons.includes(score.abnormalReason)) {
          reasons.push(score.abnormalReason)
        }

        if (reasons.length > 0) {
          const candidate = candidates.find((c) => c.id === score.candidateId)
          result.push({
            id: score.id,
            candidateName: candidate?.name || '未知',
            subjectName: subject.name,
            scoreA: score.score,
            scoreB: score.crossValidation?.secondScore || 0,
            reasons,
            types,
          })
        }
      })
    })
    return result
  }, [scores, candidates, examSubjects])

  const filteredScores = useMemo(() => {
    return scores.filter((s) => {
      if (filterSubject && s.subjectId !== filterSubject) return false
      if (filterStatus && s.status !== filterStatus) return false
      if (onlyAbnormal) {
        const isAb = abnormalScoresDetail.some((ab) => ab.id === s.id) || s.isAbnormal
        if (!isAb) return false
      }
      return true
    })
  }, [scores, filterSubject, filterStatus, onlyAbnormal, abnormalScoresDetail])

  const crossFailCount = abnormalScoresDetail.filter((a) => a.types.includes('cross')).length
  const stdDevAbnormalCount = abnormalScoresDetail.filter((a) => a.types.includes('std')).length
  const extremeCount = abnormalScoresDetail.filter((a) => a.types.includes('extreme')).length
  const abnormalCount = abnormalScoresDetail.length
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

      const scoreA = Number(values.scoreA)
      const scoreB = Number(values.scoreB)
      const teacherA = values.teacherA || '阅卷老师A'
      const teacherB = values.teacherB || '阅卷老师B'

      const crossResult = crossValidateScores(scoreA, scoreB, 3)

      const subjectExistingScores = scores.filter((s) => s.subjectId === values.subjectId)
      const allScoresForSubject = [...subjectExistingScores.map((s) => s.score), scoreA]
      const abnList = detectScoreAbnormalities(
        [{ candidateId: values.candidateId, subjectId: values.subjectId, score: scoreA }],
        allScoresForSubject
      )

      const reasons: string[] = []
      if (!crossResult.passed) reasons.push(`双评分差过大(${crossResult.difference}分)`)
      abnList.forEach((a) => reasons.push(a.reason))

      const isAbnormal = reasons.length > 0
      const initialStatus: ScoreStatus = isAbnormal ? 'abnormal' : 'draft'

      addScore({
        candidateId: values.candidateId,
        subjectId: values.subjectId,
        score: scoreA,
        enteredBy: teacherA,
        status: initialStatus,
        isAbnormal,
        abnormalReason: reasons.length > 0 ? reasons.join('；') : undefined,
        crossValidation: {
          secondScore: scoreB,
          secondEnteredBy: teacherB,
          difference: crossResult.difference,
          passed: crossResult.passed,
        },
      })

      if (isAbnormal) {
        message.warning(
          {
            content: `成绩已录入，检测到 ${reasons.length} 项异常，顶部已显示`,
            duration: 4,
          }
        )
      } else {
        message.success('成绩录入成功，双评验证通过')
      }
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
        message.error('交叉验证未通过（双评分差>3分），无法标记为已验证')
        return
      }
      const hasAbnormal = abnormalScoresDetail.some((a) => a.id === selectedScore.id)
      if (selectedScore.isAbnormal || hasAbnormal) {
        message.error('存在异常标记，请先人工复核并清除异常')
        return
      }
      verifyScore(selectedScore.id, currentUser.name)
      message.success('成绩验证通过')
      setIsVerifyOpen(false)
      setSelectedScore(null)
    }
  }

  const clearAbnormal = (scoreId: string) => {
    updateScore(scoreId, {
      isAbnormal: false,
      abnormalReason: undefined,
      status: 'draft',
    })
    message.success('已清除异常标记，状态回到待确认')
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
              <div style={{ color: '#888', fontSize: 11 }}>{c.idCard.slice(-6)}</div>
            </div>
          </Space>
        ) : (
          '-'
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
      title: '老师A评分',
      dataIndex: 'score',
      width: 110,
      render: (v: number, record: Score) => (
        <div>
          <strong style={{ fontSize: 16 }}>{v}</strong>
          <div style={{ fontSize: 10, color: '#888' }}>{record.enteredBy}</div>
        </div>
      ),
    },
    {
      title: '老师B评分',
      key: 'secondScore',
      width: 110,
      render: (_: any, record: Score) => (
        <div>
          <strong style={{ fontSize: 16 }}>{record.crossValidation?.secondScore ?? '-'}</strong>
          <div style={{ fontSize: 10, color: '#888' }}>
            {record.crossValidation?.secondEnteredBy || ''}
          </div>
        </div>
      ),
    },
    {
      title: '分差',
      key: 'diff',
      width: 100,
      render: (_: any, record: Score) => {
        const diff = record.crossValidation?.difference || 0
        const passed = record.crossValidation?.passed
        return (
          <Tag color={passed ? 'green' : 'red'}>
            {diff}分 {passed ? '✓' : '✗'}
          </Tag>
        )
      },
    },
    {
      title: '异常标记',
      key: 'abn',
      width: 160,
      render: (_: any, record: Score) => {
        const detail = abnormalScoresDetail.find((a) => a.id === record.id)
        if (!detail && !record.isAbnormal) {
          return <Tag color="green" icon={<CheckCircleOutlined />}>全部正常</Tag>
        }
        const actualReasons = detail?.reasons || (record.abnormalReason ? [record.abnormalReason] : [])
        return (
          <Tooltip title={actualReasons.join('；')}>
            <Space>
              {detail?.types.includes('cross') && <Tag color="red">分差</Tag>}
              {detail?.types.includes('std') && <Tag color="purple">3σ</Tag>}
              {detail?.types.includes('extreme') && <Tag color="magenta">极端</Tag>}
              {!detail && record.isAbnormal && <Tag color="orange">其他</Tag>}
            </Space>
          </Tooltip>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: statusTag,
    },
    {
      title: '录入时间',
      dataIndex: 'createdAt',
      width: 150,
      render: (t: string) => dayjs(t).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right' as const,
      render: (_: any, record: Score) => {
        const hasAbnormal = abnormalScoresDetail.some((a) => a.id === record.id)
        const crossPassed = record.crossValidation?.passed
        return (
          <Space>
            <Button type="link" size="small" onClick={() => setSelectedScore(record)}>
              详情
            </Button>
            {(hasAbnormal || record.isAbnormal) && (
              <Button
                type="link"
                size="small"
                style={{ color: '#fa8c16' }}
                onClick={() => clearAbnormal(record.id)}
              >
                复核通过
              </Button>
            )}
            {record.status === 'draft' && crossPassed && !hasAbnormal && !record.isAbnormal && (
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
        )
      },
    },
  ]

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="成绩总数"
              value={scores.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="已验证通过" value={verifiedCount} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="待复核异常"
              value={abnormalCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="双评未通过"
              value={crossFailCount}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="标准差(3σ)异常"
              value={stdDevAbnormalCount}
              valueStyle={{ color: '#722ed1' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="极端分数"
              value={extremeCount}
              valueStyle={{ color: '#eb2f96' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {abnormalScoresDetail.length > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined style={{ fontSize: 20 }} />}
          closable={false}
          message={
            <Space size="large">
              <strong style={{ fontSize: 15 }}>
                ⚠️ 实时检测到 {abnormalScoresDetail.length} 条异常成绩，请人工复核：
              </strong>
              <Tag color="red">分差过大: {crossFailCount}</Tag>
              <Tag color="purple">3σ偏离: {stdDevAbnormalCount}</Tag>
              <Tag color="magenta">极端分: {extremeCount}</Tag>
            </Space>
          }
          description={
            <List
              size="small"
              dataSource={abnormalScoresDetail}
              locale={{ emptyText: '暂无异常' }}
              renderItem={(item) => (
                <List.Item
                  style={{ padding: '10px 8px', borderBottom: '1px dashed #ffccc7' }}
                  actions={[
                    <Button type="link" size="small" onClick={() => {
                      const sc = scores.find(s => s.id === item.id)
                      if (sc) setSelectedScore(sc)
                    }}>
                      查看详情
                    </Button>,
                    <Button
                      type="link"
                      size="small"
                      style={{ color: '#fa8c16' }}
                      onClick={() => clearAbnormal(item.id)}
                    >
                      复核通过
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 6,
                          background: '#fff2f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ff4d4f',
                          fontSize: 18,
                          fontWeight: 'bold',
                        }}
                      >
                        !
                      </div>
                    }
                    title={
                      <Space size="middle">
                        <span style={{ fontSize: 14, fontWeight: 500 }}>
                          👤 {item.candidateName}
                        </span>
                        <Tag color="blue">📚 {item.subjectName}</Tag>
                        <span>
                          老师A: <strong style={{ color: '#ff4d4f', fontSize: 16 }}>{item.scoreA}</strong>
                          {' / '}
                          老师B: <strong style={{ color: '#ff4d4f', fontSize: 16 }}>{item.scoreB}</strong>
                        </span>
                      </Space>
                    }
                    description={
                      <Space size={[6, 4]} wrap style={{ marginTop: 4 }}>
                        {item.types.includes('cross') && (
                          <Tag color="red" icon={<ExclamationCircleOutlined />}>
                            双评分差过大
                          </Tag>
                        )}
                        {item.types.includes('std') && (
                          <Tag color="purple" icon={<ExclamationCircleOutlined />}>
                            偏离平均值±3σ标准差
                          </Tag>
                        )}
                        {item.types.includes('extreme') && (
                          <Tag color="magenta" icon={<ExclamationCircleOutlined />}>
                            极端分数（低于30 或 高于95）
                          </Tag>
                        )}
                        {item.reasons.map((r, idx) => (
                          <span key={idx} style={{ fontSize: 12, color: '#873800' }}>
                            📌 {r}
                          </span>
                        ))}
                      </Space>
                    }
                  />
                </List.Item>
              )}
              style={{ maxHeight: 360, overflowY: 'auto', marginTop: 8 }}
            />
          }
          style={{ marginBottom: 16, border: '1px solid #ffa39e' }}
          banner={false}
        />
      )}

      {abnormalScoresDetail.length === 0 && scores.length > 0 && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="✅ 当前所有成绩均通过双评交叉验证、标准差检测和极端分数检查，无异常"
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        title="成绩管理（支持双评录入 + 实时异常检测）"
        extra={
          <Space>
            <Button icon={<ExportOutlined />} onClick={() => exportScoresToExcel(filteredScores)}>
              导出Excel
            </Button>
            <Button type="primary" icon={<FileTextOutlined />} onClick={handleAdd}>
              双评录入成绩
            </Button>
          </Space>
        }
      >
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
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
            danger={onlyAbnormal}
            icon={<WarningOutlined />}
            onClick={() => setOnlyAbnormal(!onlyAbnormal)}
          >
            仅看异常 ({abnormalCount})
          </Button>
        </div>

        <Alert
          type="info"
          showIcon
          message="交叉验证规则（录入时实时检测，结果立刻显示在上方异常列表）："
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>
                两位阅卷老师分数<strong>分差 ≤ 3 分</strong>：自动通过
              </li>
              <li>
                <strong>分差大于 3 分</strong>：标记「双评分差过大」异常，需人工复核
              </li>
              <li>
                <strong>偏离该科目平均分 ±3σ</strong>：标记「标准差异常」，需人工复核
              </li>
              <li>
                <strong>分数低于 30 或高于 95</strong>：标记「极端分数」，需人工复核
              </li>
            </ul>
          }
          style={{ marginBottom: 16 }}
        />

        {filteredScores.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredScores}
            rowKey="id"
            scroll={{ x: 1500 }}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty
            description={
              onlyAbnormal ? '暂无异常成绩' : '暂无成绩记录，点击右上角「双评录入成绩」开始'
            }
            style={{ padding: 60 }}
          />
        )}
      </Card>

      <Modal
        title="双评录入成绩（老师A + 老师B分别独立评分）"
        open={isAddOpen}
        onOk={handleSubmit}
        onCancel={() => setIsAddOpen(false)}
        okText="提交录入并自动检测"
        width={680}
        confirmLoading={false}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="选择考生"
                name="candidateId"
                rules={[{ required: true, message: '请选择考生' }]}
              >
                <Select
                  placeholder="搜索考生姓名或身份证号"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) => {
                    const c = candidates.find((cc) => cc.id === option?.value)
                    return c ? c.name.includes(input) || c.idCard.includes(input) : false
                  }}
                >
                  {candidates.map((c) => (
                    <Option key={c.id} value={c.id}>
                      {c.name} - 尾号{c.idCard.slice(-6)}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="考试科目"
                name="subjectId"
                rules={[{ required: true, message: '请选择科目' }]}
              >
                <Select placeholder="请选择考试科目">
                  {examSubjects.map((s) => (
                    <Option key={s.id} value={s.id}>
                      {s.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <DividerLike>📝 阅卷老师 A 独立评分</DividerLike>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="分数（0-100，整数）"
                name="scoreA"
                rules={[
                  { required: true, message: '请输入老师A的评分' },
                  { type: 'number', min: 0, max: 100, message: '分数范围 0-100' },
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={100} precision={0} size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="阅卷人姓名" name="teacherA" initialValue="阅卷老师A">
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>
          <DividerLike>📝 阅卷老师 B 独立评分（交叉验证用）</DividerLike>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="分数（0-100，整数）"
                name="scoreB"
                rules={[
                  { required: true, message: '请输入老师B的评分' },
                  { type: 'number', min: 0, max: 100, message: '分数范围 0-100' },
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} max={100} precision={0} size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="阅卷人姓名" name="teacherB" initialValue="阅卷老师B">
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>
          <Alert
            type="info"
            showIcon
            message="提交后系统会立即执行："
            description={
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                <li>双评分差对比（|老师A - 老师B| ≤ 3 通过）</li>
                <li>3σ标准差检测（相对该科目所有已录入成绩）</li>
                <li>极端分检测（低于30分 或 高于95分）</li>
                <li>任何异常都会立刻显示在页面顶部的红色异常列表中</li>
              </ol>
            }
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
            <p>确认将以下成绩标记为「已验证」？</p>
            <ul>
              <li>考生: {candidates.find((c) => c.id === selectedScore.candidateId)?.name}</li>
              <li>科目: {examSubjects.find((s) => s.id === selectedScore.subjectId)?.name}</li>
              <li>
                初评: <strong>{selectedScore.score}</strong>分，
                复评: <strong>{selectedScore.crossValidation?.secondScore}</strong>分
              </li>
              <li>
                分差: <strong>{selectedScore.crossValidation?.difference}</strong>分
                {selectedScore.crossValidation?.passed ? (
                  <Tag color="green">✓ 双评通过</Tag>
                ) : (
                  <Tag color="red">✗ 双评未通过</Tag>
                )}
              </li>
            </ul>
          </div>
        )}
      </Modal>

      <Drawer
        title="成绩详情 & 完整异常报告"
        placement="right"
        width={620}
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
              <Descriptions.Item label="初评分数（老师A）">
                <strong style={{ fontSize: 18 }}>{selectedScore.score}</strong> 分
                <div style={{ fontSize: 12, color: '#888' }}>录入人：{selectedScore.enteredBy}</div>
              </Descriptions.Item>
              {selectedScore.crossValidation && (
                <>
                  <Descriptions.Item label="复评分数（老师B）">
                    <strong style={{ fontSize: 18 }}>{selectedScore.crossValidation.secondScore}</strong> 分
                    <div style={{ fontSize: 12, color: '#888' }}>
                      录入人：{selectedScore.crossValidation.secondEnteredBy}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="交叉验证结果">
                    <Tag color={selectedScore.crossValidation.passed ? 'green' : 'red'}>
                      分差 {selectedScore.crossValidation.difference} 分
                      {selectedScore.crossValidation.passed ? ' ✓ 通过' : ' ✗ 未通过（>3分）'}
                    </Tag>
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="异常检测报告">
                {(() => {
                  const detail = abnormalScoresDetail.find((a) => a.id === selectedScore.id)
                  if (!detail && !selectedScore.isAbnormal) {
                    return <Tag color="green" icon={<CheckCircleOutlined />}>✅ 全部检测通过</Tag>
                  }
                  const allReasons = detail?.reasons || (selectedScore.abnormalReason ? [selectedScore.abnormalReason] : [])
                  return (
                    <div>
                      <Tag color="red" icon={<WarningOutlined />}>
                        检测到 {allReasons.length} 项异常
                      </Tag>
                      <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                        {allReasons.map((r, i) => (
                          <li key={i} style={{ color: '#d4380d', marginBottom: 4 }}>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">{statusTag(selectedScore.status)}</Descriptions.Item>
              {selectedScore.verifiedBy && (
                <>
                  <Descriptions.Item label="验证人">{selectedScore.verifiedBy}</Descriptions.Item>
                  <Descriptions.Item label="验证时间">
                    {selectedScore.verifiedAt &&
                      dayjs(selectedScore.verifiedAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="录入时间">
                {dayjs(selectedScore.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="交叉验证流程进度">
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
                status={
                  abnormalScoresDetail.some((a) => a.id === selectedScore.id) || selectedScore.isAbnormal
                    ? 'exception'
                    : 'active'
                }
              />
              <div style={{ marginTop: 12, fontSize: 12, color: '#888', lineHeight: 1.8 }}>
                初评录入（老师A） → 复评录入（老师B） → 交叉验证（分差≤3分） → 标准差/极端分检测 →
                成绩验证 → 成绩定档
              </div>
            </Card>
          </>
        )}
      </Drawer>
    </div>
  )
}

export default ScoreManagement
