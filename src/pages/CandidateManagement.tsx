import React, { useState } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  Tag,
  Space,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Statistic,
  Avatar,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  UserOutlined,
  FileProtectOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useAppStore } from '@/store/useAppStore'
import type { Candidate, SpecialNeedType } from '@/types'
import { exportCandidatesToExcel } from '@/utils/exporters'

const { Search } = Input
const { Option } = Select

const CandidateManagement: React.FC = () => {
  const {
    candidates,
    examSubjects,
    addCandidate,
    updateCandidate,
    deleteCandidate,
  } = useAppStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null)
  const [searchText, setSearchText] = useState('')
  const [filterOrigin, setFilterOrigin] = useState<string | undefined>()
  const [filterSpecialNeed, setFilterSpecialNeed] = useState<string | undefined>()
  const [form] = Form.useForm()

  const filteredCandidates = candidates.filter((c) => {
    const matchSearch =
      !searchText ||
      c.name.includes(searchText) ||
      c.idCard.includes(searchText)
    const matchOrigin = !filterOrigin || c.origin === filterOrigin
    const matchSpecial = !filterSpecialNeed || c.specialNeed === filterSpecialNeed
    return matchSearch && matchOrigin && matchSpecial
  })

  const regions = [...new Set(candidates.map((c) => c.origin))]

  const handleAdd = () => {
    setEditingCandidate(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate)
    form.setFieldsValue({
      name: candidate.name,
      idCard: candidate.idCard,
      subjects: candidate.subjects,
      origin: candidate.origin,
      school: candidate.school,
      specialNeed: candidate.specialNeed,
      specialNeedDetail: candidate.specialNeedDetail,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingCandidate) {
        updateCandidate(editingCandidate.id, values)
        message.success('考生信息更新成功')
      } else {
        addCandidate({ ...values, photo: '' })
        message.success('考生添加成功')
      }
      setIsModalOpen(false)
    } catch {
      message.error('请检查表单填写')
    }
  }

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        form.setFieldValue('photo', e.target?.result as string)
      }
      reader.readAsDataURL(file)
      return false
    },
    maxCount: 1,
    accept: 'image/*',
  }

  const specialNeedTag = (need: SpecialNeedType) => {
    const map: Record<SpecialNeedType, { color: string; text: string }> = {
      none: { color: 'default', text: '无' },
      disability: { color: 'orange', text: '残疾' },
      hearing: { color: 'blue', text: '听力障碍' },
      visual: { color: 'purple', text: '视力障碍' },
      other: { color: 'cyan', text: '其他' },
    }
    return <Tag color={map[need].color}>{map[need].text}</Tag>
  }

  const statusTag = (status: Candidate['status']) => {
    const map = {
      registered: { color: 'blue', text: '已报名' },
      assigned: { color: 'green', text: '已排座' },
      absent: { color: 'default', text: '缺考' },
      cheated: { color: 'red', text: '违纪' },
    }
    return <Tag color={map[status].color}>{map[status].text}</Tag>
  }

  const columns = [
    {
      title: '照片',
      dataIndex: 'photo',
      width: 70,
      render: (photo: string) =>
        photo ? (
          <img src={photo} alt="照片" style={{ width: 40, height: 40, borderRadius: 4 }} />
        ) : (
          <Avatar icon={<UserOutlined />} size={40} />
        ),
    },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '身份证号', dataIndex: 'idCard', width: 200 },
    {
      title: '报考科目',
      dataIndex: 'subjects',
      width: 180,
      render: (subjects: string[]) =>
        subjects.map((sid) => {
          const s = examSubjects.find((x) => x.id === sid)
          return s ? <Tag key={sid}>{s.name}</Tag> : null
        }),
    },
    { title: '生源地', dataIndex: 'origin', width: 100 },
    { title: '所在学校', dataIndex: 'school', width: 140 },
    { title: '特殊需求', dataIndex: 'specialNeed', width: 100, render: specialNeedTag },
    { title: '状态', dataIndex: 'status', width: 100, render: statusTag },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: Candidate) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除?" onConfirm={() => deleteCandidate(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
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
              title="考生总数"
              value={candidates.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已排座"
              value={candidates.filter((c) => c.status === 'assigned').length}
              prefix={<FileProtectOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="特殊考生"
              value={candidates.filter((c) => c.specialNeed !== 'none').length}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="今日新增"
              value={0}
              prefix={<PlusOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Space wrap>
            <Search
              placeholder="搜索姓名/身份证"
              allowClear
              style={{ width: 240 }}
              prefix={<SearchOutlined />}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              placeholder="筛选生源地"
              allowClear
              style={{ width: 140 }}
              onChange={setFilterOrigin}
            >
              {regions.map((r) => (
                <Option key={r} value={r}>
                  {r}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="筛选特殊需求"
              allowClear
              style={{ width: 140 }}
              onChange={setFilterSpecialNeed}
            >
              <Option value="none">无</Option>
              <Option value="disability">残疾</Option>
              <Option value="hearing">听力障碍</Option>
              <Option value="visual">视力障碍</Option>
              <Option value="other">其他</Option>
            </Select>
          </Space>
          <Space>
            <Button icon={<ExportOutlined />} onClick={() => exportCandidatesToExcel(filteredCandidates)}>
              导出Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增考生
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={filteredCandidates}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title={editingCandidate ? '编辑考生信息' : '新增考生'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => setIsModalOpen(false)}
        width={640}
        okText="保存"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="身份证号"
                name="idCard"
                rules={[
                  { required: true, message: '请输入身份证号' },
                  { len: 18, message: '身份证号应为18位' },
                ]}
              >
                <Input placeholder="请输入18位身份证号" maxLength={18} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="报考科目"
                name="subjects"
                rules={[{ required: true, message: '请选择报考科目' }]}
              >
                <Select mode="multiple" placeholder="请选择科目">
                  {examSubjects.map((s) => (
                    <Option key={s.id} value={s.id}>
                      {s.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="生源地"
                name="origin"
                rules={[{ required: true, message: '请选择生源地' }]}
              >
                <Select placeholder="请选择生源地">
                  {regions.map((r) => (
                    <Option key={r} value={r}>
                      {r}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="所在学校"
                name="school"
                rules={[{ required: true, message: '请输入所在学校' }]}
              >
                <Input placeholder="请输入学校名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="特殊需求"
                name="specialNeed"
                initialValue="none"
              >
                <Select placeholder="请选择特殊需求">
                  <Option value="none">无</Option>
                  <Option value="disability">残疾（需无障碍设施）</Option>
                  <Option value="hearing">听力障碍（需助听设备）</Option>
                  <Option value="visual">视力障碍（需大字试卷）</Option>
                  <Option value="other">其他特殊需求</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="特殊需求详情" name="specialNeedDetail">
            <Input.TextArea placeholder="请详细描述特殊需求（如适用）" rows={2} />
          </Form.Item>
          <Form.Item label="考生照片" name="photo">
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>上传照片</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CandidateManagement
