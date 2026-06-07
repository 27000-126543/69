import React, { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Timeline,
  Alert,
  Statistic,
  Progress,
  Drawer,
  Descriptions,
  List,
  Badge,
  Empty,
} from 'antd'
import {
  CarOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import { checkGPSAnomalies, type GPSAlert } from '@/algorithms/anomalyDetection'
import type { ExamTask, ExamTaskStatus } from '@/types'
import dayjs from 'dayjs'

const ExamTaskMonitoring: React.FC = () => {
  const { examTasks, examSites, updateExamTask } = useAppStore()
  const [selectedTask, setSelectedTask] = useState<ExamTask | null>(null)
  const [alerts, setAlerts] = useState<GPSAlert[]>([])
  const [simulating, setSimulating] = useState(false)

  useEffect(() => {
    const allAlerts: GPSAlert[] = []
    examTasks.forEach((task) => {
      if (task.gpsTrack && task.gpsTrack.length > 0) {
        const taskAlerts = checkGPSAnomalies(task.gpsTrack, {
          maxSpeedKmh: 80,
          maxStopDurationMinutes: 10,
          deviationThresholdMeters: 500,
        })
        allAlerts.push(...taskAlerts)
      }
    })
    setAlerts(allAlerts)
  }, [examTasks])

  const statusConfig: Record<ExamTaskStatus, { color: string; text: string; icon: React.ReactNode }> = {
    pending: { color: 'default', text: '待开始', icon: <ClockCircleOutlined /> },
    transporting: { color: 'orange', text: '押运中', icon: <CarOutlined /> },
    arrived: { color: 'cyan', text: '已到达', icon: <EnvironmentOutlined /> },
    ongoing: { color: 'blue', text: '考试中', icon: <PlayCircleOutlined /> },
    collected: { color: 'purple', text: '已收卷', icon: <SafetyCertificateOutlined /> },
    returned: { color: 'green', text: '已送返', icon: <CheckCircleOutlined /> },
  }

  const advanceStatus = (task: ExamTask) => {
    const flow: ExamTaskStatus[] = ['pending', 'transporting', 'arrived', 'ongoing', 'collected', 'returned']
    const currentIdx = flow.indexOf(task.status)
    if (currentIdx < flow.length - 1) {
      const nextStatus = flow[currentIdx + 1]
      updateExamTask(task.id, {
        status: nextStatus,
        completedAt: nextStatus === 'returned' ? new Date().toISOString() : undefined,
      })
    }
  }

  const columns = [
    {
      title: '任务类型',
      dataIndex: 'type',
      width: 120,
      render: (type: ExamTask['type']) => {
        const map = {
          paper_transport: '试卷押运',
          exam_session: '考试场次',
          paper_return: '试卷送返',
        }
        return map[type]
      },
    },
    { title: '任务标题', dataIndex: 'title', width: 200 },
    {
      title: '考点',
      dataIndex: 'siteId',
      width: 180,
      render: (sid: string) => examSites.find((s) => s.id === sid)?.name || '-',
    },
    { title: '车辆编号', dataIndex: 'vehicleId', width: 120, render: (v: string | undefined) => v || '-' },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status: ExamTaskStatus) => (
        <Tag color={statusConfig[status].color} icon={statusConfig[status].icon}>
          {statusConfig[status].text}
        </Tag>
      ),
    },
    { title: '负责人', dataIndex: 'currentHandler', width: 100 },
    {
      title: 'GPS异常',
      key: 'abnormal',
      width: 100,
      render: (_: any, record: ExamTask) => {
        const hasAbnormal = record.gpsTrack?.some((p) => p.isAbnormal)
        return hasAbnormal ? (
          <Badge status="error" text={<span style={{ color: '#ff4d4f' }}>异常</span>} />
        ) : (
          <Badge status="success" text="正常" />
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: ExamTask) => (
        <Space>
          <Button type="link" size="small" onClick={() => setSelectedTask(record)}>
            详情
          </Button>
          {record.status !== 'returned' && (
            <Button type="link" size="small" onClick={() => advanceStatus(record)}>
              更新状态
            </Button>
          )}
        </Space>
      ),
    },
  ]

  const statusFlow: ExamTaskStatus[] = ['pending', 'transporting', 'arrived', 'ongoing', 'collected', 'returned']

  const transportingCount = examTasks.filter((t) => t.status === 'transporting').length
  const abnormalCount = alerts.length
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="任务总数"
              value={examTasks.length}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中任务"
              value={transportingCount}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="GPS警告"
              value={abnormalCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="严重异常"
              value={criticalCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card
            title="考务任务列表"
            extra={
              <Button
                icon={<ReloadOutlined />}
                onClick={() => setSimulating(!simulating)}
                type={simulating ? 'primary' : 'default'}
              >
                {simulating ? '停止模拟' : '模拟数据更新'}
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={examTasks}
              rowKey="id"
              pagination={{ pageSize: 8 }}
              expandable={{
                expandedRowRender: (record) => (
                  <div className="timeline-container">
                    <Timeline
                      mode="left"
                      items={statusFlow.map((s, idx) => {
                        const currentIdx = statusFlow.indexOf(record.status)
                        return {
                          color: idx <= currentIdx ? 'blue' : 'gray',
                          dot: idx === currentIdx ? <CarOutlined /> : undefined,
                          children: (
                            <div>
                              <div style={{ fontWeight: 500 }}>{statusConfig[s].text}</div>
                              <div style={{ color: '#888', fontSize: 12 }}>
                                {idx <= currentIdx ? '已完成' : '待进行'}
                              </div>
                            </div>
                          ),
                        }
                      })}
                    />
                  </div>
                ),
              }}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card title="实时GPS异常报警" extra={<Tag color="red">{alerts.length}</Tag>}>
            {alerts.length > 0 ? (
              <List
                dataSource={alerts}
                renderItem={(alert) => (
                  <List.Item className="alert-item">
                    <Alert
                      type={alert.severity === 'critical' ? 'error' : 'warning'}
                      showIcon
                      message={
                        <Space>
                          <strong>
                            {{ speed: '超速报警', stop: '异常停留', deviation: '轨迹偏离' }[alert.type]}
                          </strong>
                          <Tag color={alert.severity === 'critical' ? 'red' : 'orange'}>
                            {alert.severity === 'critical' ? '严重' : '警告'}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={0}>
                          <span>{alert.message}</span>
                          <span style={{ fontSize: 11, color: '#888' }}>
                            {dayjs(alert.timestamp).format('HH:mm:ss')} · 位置: {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                          </span>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无GPS异常" style={{ padding: 40 }} />
            )}
          </Card>
        </Col>
      </Row>

      <Drawer
        title="任务详情"
        placement="right"
        width={640}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      >
        {selectedTask && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="任务标题" span={2}>
                {selectedTask.title}
              </Descriptions.Item>
              <Descriptions.Item label="任务类型">
                {{ paper_transport: '试卷押运', exam_session: '考试场次', paper_return: '试卷送返' }[selectedTask.type]}
              </Descriptions.Item>
              <Descriptions.Item label="当前状态">
                <Tag color={statusConfig[selectedTask.status].color}>
                  {statusConfig[selectedTask.status].text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="考点">
                {examSites.find((s) => s.id === selectedTask.siteId)?.name}
              </Descriptions.Item>
              <Descriptions.Item label="车辆编号">{selectedTask.vehicleId || '-'}</Descriptions.Item>
              <Descriptions.Item label="负责人">{selectedTask.currentHandler}</Descriptions.Item>
              <Descriptions.Item label="开始时间">
                {selectedTask.startedAt && dayjs(selectedTask.startedAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {selectedTask.completedAt ? dayjs(selectedTask.completedAt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="任务进度" style={{ marginBottom: 16 }}>
              <Progress
                percent={Math.round(((statusFlow.indexOf(selectedTask.status) + 1) / statusFlow.length) * 100)}
                status={selectedTask.status === 'returned' ? 'success' : 'active'}
              />
              <Timeline
                style={{ marginTop: 16 }}
                items={statusFlow.map((s, idx) => {
                  const currentIdx = statusFlow.indexOf(selectedTask.status)
                  return {
                    color: idx < currentIdx ? 'green' : idx === currentIdx ? 'blue' : 'gray',
                    children: (
                      <div>
                        <div style={{ fontWeight: 500 }}>{statusConfig[s].text}</div>
                        <div style={{ color: '#888', fontSize: 12 }}>
                          {idx < currentIdx ? '✓ 已完成' : idx === currentIdx ? '⏳ 进行中' : '待进行'}
                        </div>
                      </div>
                    ),
                  }
                })}
              />
            </Card>

            {selectedTask.gpsTrack && selectedTask.gpsTrack.length > 0 && (
              <Card size="small" title="GPS轨迹">
                <Table
                  size="small"
                  dataSource={selectedTask.gpsTrack}
                  rowKey="timestamp"
                  pagination={false}
                  columns={[
                    {
                      title: '时间',
                      dataIndex: 'timestamp',
                      render: (t: string) => dayjs(t).format('HH:mm:ss'),
                    },
                    { title: '纬度', dataIndex: 'lat', render: (v: number) => v.toFixed(5) },
                    { title: '经度', dataIndex: 'lng', render: (v: number) => v.toFixed(5) },
                    { title: '速度(km/h)', dataIndex: 'speed', render: (v: number) => v.toFixed(1) },
                    {
                      title: '状态',
                      dataIndex: 'isAbnormal',
                      render: (v: boolean, record: any) =>
                        v ? (
                          <Tag color="red" icon={<WarningOutlined />}>
                            {record.abnormalType}
                          </Tag>
                        ) : (
                          <Tag color="green">正常</Tag>
                        ),
                    },
                  ]}
                />
              </Card>
            )}
          </>
        )}
      </Drawer>
    </div>
  )
}

export default ExamTaskMonitoring
