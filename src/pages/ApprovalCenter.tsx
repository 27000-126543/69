import React, { useState } from 'react'
import {
  Tabs,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Input,
  message,
  Card,
  Descriptions,
  Badge,
  Empty,
} from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import type { ApprovalRequest, ApprovalStatus } from '@/types'
import dayjs from 'dayjs'

const { TextArea } = Input

const ApprovalCenter: React.FC = () => {
  const { approvals, processApproval, currentUser, arrangements } = useAppStore()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)

  const handleAction = (approval: ApprovalRequest, type: 'approve' | 'reject') => {
    setProcessingId(approval.id)
    setActionType(type)
    setComment('')
  }

  const confirmAction = () => {
    if (processingId && actionType) {
      processApproval(
        processingId,
        actionType === 'approve' ? 'approved' : 'rejected',
        comment || (actionType === 'approve' ? '同意' : '不同意'),
        currentUser.name
      )
      message.success(actionType === 'approve' ? '审批通过' : '已拒绝')
      setProcessingId(null)
      setActionType(null)
      setComment('')
    }
  }

  const statusTag = (status: ApprovalStatus) => {
    const map = {
      pending: { color: 'orange', text: '待审批', icon: <ClockCircleOutlined /> },
      approved: { color: 'green', text: '已通过', icon: <CheckOutlined /> },
      rejected: { color: 'red', text: '已拒绝', icon: <CloseOutlined /> },
      adjusting: { color: 'blue', text: '调整中', icon: <SwapOutlined /> },
    }
    return (
      <Tag color={map[status].color} icon={map[status].icon}>
        {map[status].text}
      </Tag>
    )
  }

  const typeIcon = (type: ApprovalRequest['type']) => {
    const map = {
      arrangement: <FileTextOutlined />,
      adjustment: <SwapOutlined />,
      schedule: <UserOutlined />,
      score: <ExclamationCircleOutlined />,
    }
    return map[type]
  }

  const typeLabel = (type: ApprovalRequest['type']) => {
    const map = {
      arrangement: '考场编排审批',
      adjustment: '调整申请审批',
      schedule: '调班申请审批',
      score: '成绩复核审批',
    }
    return map[type]
  }

  const columns = (showActions: boolean) => [
    {
      title: '类型',
      dataIndex: 'type',
      width: 140,
      render: (type: ApprovalRequest['type']) => (
        <Space>
          {typeIcon(type)}
          <span>{typeLabel(type)}</span>
        </Space>
      ),
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    {
      title: '申请人',
      key: 'applicant',
      width: 160,
      render: (_: any, record: ApprovalRequest) => (
        <div>
          <div>{record.proposer}</div>
          <div style={{ color: '#888', fontSize: 12 }}>{record.proposerRole}</div>
        </div>
      ),
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
    },
    { title: '状态', dataIndex: 'status', width: 120, render: statusTag },
    {
      title: '操作',
      key: 'action',
      width: showActions ? 200 : 120,
      render: (_: any, record: ApprovalRequest) => (
        <Space>
          <Button type="link" size="small" onClick={() => setSelectedApproval(record)}>
            详情
          </Button>
          {showActions && record.status === 'pending' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                style={{ color: '#52c41a' }}
                onClick={() => handleAction(record, 'approve')}
              >
                通过
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleAction(record, 'reject')}
              >
                拒绝
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  const pendingApprovals = approvals.filter((a) => a.status === 'pending')
  const processedApprovals = approvals.filter((a) => a.status !== 'pending')

  const tabItems = [
    {
      key: 'pending',
      label: (
        <span>
          待审批
          <Badge count={pendingApprovals.length} style={{ marginLeft: 8 }} />
        </span>
      ),
      children: (
        pendingApprovals.length > 0 ? (
          <Table
            columns={columns(true)}
            dataSource={pendingApprovals}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty description="暂无待审批事项" style={{ padding: 60 }} />
        )
      ),
    },
    {
      key: 'processed',
      label: '已处理',
      children: (
        processedApprovals.length > 0 ? (
          <Table
            columns={columns(false)}
            dataSource={processedApprovals}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty description="暂无已处理事项" style={{ padding: 60 }} />
        )
      ),
    },
  ]

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 48 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#fa8c16' }}>{pendingApprovals.length}</div>
            <div style={{ color: '#888' }}>待审批事项</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>
              {approvals.filter((a) => a.status === 'approved').length}
            </div>
            <div style={{ color: '#888' }}>已通过</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#ff4d4f' }}>
              {approvals.filter((a) => a.status === 'rejected').length}
            </div>
            <div style={{ color: '#888' }}>已拒绝</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#1677ff' }}>
              {approvals.filter((a) => a.type === 'arrangement').length}
            </div>
            <div style={{ color: '#888' }}>编排审批</div>
          </div>
        </div>
      </Card>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      <Modal
        title={actionType === 'approve' ? '审批通过' : '审批拒绝'}
        open={!!processingId}
        onOk={confirmAction}
        onCancel={() => {
          setProcessingId(null)
          setActionType(null)
        }}
        okText="确认"
        okButtonProps={{ danger: actionType === 'reject' }}
      >
        <div style={{ marginBottom: 12 }}>
          {actionType === 'approve' ? '确认通过该审批事项？' : '请填写拒绝理由：'}
        </div>
        {actionType === 'reject' && (
          <TextArea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="请输入拒绝理由..."
          />
        )}
      </Modal>

      <DrawerLike approval={selectedApproval} onClose={() => setSelectedApproval(null)} arrangements={arrangements} />
    </div>
  )
}

const DrawerLike: React.FC<{ approval: ApprovalRequest | null; onClose: () => void; arrangements: any[] }> = ({
  approval,
  onClose,
  arrangements,
}) => {
  if (!approval) return null
  const arrangement = arrangements.find((a) => a.id === approval.targetId)

  return (
    <Modal
      title="审批详情"
      open={!!approval}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="审批类型">
          {{ arrangement: '考场编排审批', adjustment: '调整申请', schedule: '调班申请', score: '成绩复核' }[approval.type]}
        </Descriptions.Item>
        <Descriptions.Item label="标题">{approval.title}</Descriptions.Item>
        <Descriptions.Item label="申请描述">{approval.description}</Descriptions.Item>
        <Descriptions.Item label="申请人">
          {approval.proposer} ({approval.proposerRole})
        </Descriptions.Item>
        <Descriptions.Item label="申请时间">
          {dayjs(approval.createdAt).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        <Descriptions.Item label="审批状态">
          {{
            pending: <Tag color="orange">待审批</Tag>,
            approved: <Tag color="green">已通过</Tag>,
            rejected: <Tag color="red">已拒绝</Tag>,
            adjusting: <Tag color="blue">调整中</Tag>,
          }[approval.status]}
        </Descriptions.Item>
        {approval.processedBy && (
          <>
            <Descriptions.Item label="处理人">{approval.processedBy}</Descriptions.Item>
            <Descriptions.Item label="处理时间">
              {approval.processedAt && dayjs(approval.processedAt).format('YYYY-MM-DD HH:mm:ss')}
            </Descriptions.Item>
            <Descriptions.Item label="审批意见">{approval.comment || '-'}</Descriptions.Item>
          </>
        )}
        {arrangement && (
          <Descriptions.Item label="关联考场数">{arrangement.assignments?.length || 0} 个考生</Descriptions.Item>
        )}
      </Descriptions>
    </Modal>
  )
}

export default ApprovalCenter
