import React from 'react'
import { Row, Col, Card, Statistic, Progress, List, Tag, Space } from 'antd'
import {
  TeamOutlined,
  FileProtectOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  UserOutlined,
  RiseOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import dayjs from 'dayjs'
import ReactECharts from 'echarts-for-react'

const Dashboard: React.FC = () => {
  const { candidates, arrangements, examTasks, approvals, scores, invigilators, examSites } =
    useAppStore()

  const approvedArr = arrangements.filter((a) => a.approvalStatus === 'approved').length
  const pendingArr = arrangements.filter((a) => a.approvalStatus === 'pending').length
  const abnormalTasks = examTasks.filter((t) => t.gpsTrack?.some((p) => p.isAbnormal)).length
  const abnormalScores = scores.filter((s) => s.isAbnormal).length
  const assignedCandidates = candidates.filter((c) => c.status === 'assigned').length

  const attendanceOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        name: '考生状态',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
        },
        data: [
          { value: assignedCandidates, name: '已排座', itemStyle: { color: '#52c41a' } },
          { value: candidates.filter((c) => c.status === 'registered').length, name: '待排座', itemStyle: { color: '#1677ff' } },
          { value: candidates.filter((c) => c.status === 'absent').length, name: '缺考', itemStyle: { color: '#8c8c8c' } },
          { value: candidates.filter((c) => c.status === 'cheated').length, name: '违纪', itemStyle: { color: '#ff4d4f' } },
        ],
      },
    ],
  }

  const subjectOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['法律基础', '财务管理', '人力资源', '工程管理', '计算机应用', '英语四级'],
      axisLabel: { rotate: 30, fontSize: 11 },
    },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        data: [45, 38, 42, 35, 48, 40],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1677ff' },
              { offset: 1, color: '#69c0ff' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  }

  const recentApprovals = approvals.slice(0, 5)
  const recentTasks = examTasks.slice(0, 5)

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card className="dashboard-card">
            <Statistic
              title="考生总数"
              value={candidates.length}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
            <Progress
              percent={Math.round((assignedCandidates / candidates.length) * 100)}
              showInfo
              style={{ marginTop: 12 }}
              format={(percent) => `已排座 ${percent}%`}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="dashboard-card">
            <Statistic
              title="编排方案"
              value={arrangements.length}
              prefix={<FileProtectOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={`/ ${approvedArr} 已通过`}
            />
            <div style={{ marginTop: 12, textAlign: 'left' }}>
              <Tag color="orange">{pendingArr} 待审批</Tag>
              <Tag color="green">{approvedArr} 已通过</Tag>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="dashboard-card">
            <Statistic
              title="考务任务"
              value={examTasks.length}
              prefix={<CarOutlined />}
              valueStyle={{ color: '#fa8c16' }}
              suffix="个进行中"
            />
            <div style={{ marginTop: 12, textAlign: 'left' }}>
              {abnormalTasks > 0 ? (
                <Tag color="red" icon={<WarningOutlined />}>
                  {abnormalTasks} 个异常
                </Tag>
              ) : (
                <Tag color="green">一切正常</Tag>
              )}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card className="dashboard-card">
            <Statistic
              title="待审批事项"
              value={approvals.filter((a) => a.status === 'pending').length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
              suffix={`项`}
            />
            <div style={{ marginTop: 12 }}>
              <RiseOutlined style={{ color: '#52c41a' }} /> 异常分数:
              <strong style={{ color: '#ff4d4f', marginLeft: 4 }}>{abnormalScores}</strong>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="考生状态分布" style={{ height: 380 }}>
            <ReactECharts option={attendanceOption} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="各科目报考人数" style={{ height: 380 }}>
            <ReactECharts option={subjectOption} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="最新审批事项" extra={<Tag color="blue">{recentApprovals.length} 条</Tag>}>
            <List
              dataSource={recentApprovals}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    avatar={<CheckCircleOutlined style={{ fontSize: 20, color: '#1677ff' }} />}
                    title={
                      <Space>
                        {item.title}
                        <Tag
                          color={
                            item.status === 'approved'
                              ? 'green'
                              : item.status === 'rejected'
                              ? 'red'
                              : 'orange'
                          }
                        >
                          {item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '已拒绝' : '待审批'}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space>
                        <UserOutlined /> {item.proposer}
                        <ClockCircleOutlined /> {dayjs(item.createdAt).format('MM-DD HH:mm')}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="考务任务状态" extra={<Tag color="orange">{recentTasks.length} 个</Tag>}>
            <List
              dataSource={recentTasks}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    avatar={<CarOutlined style={{ fontSize: 20, color: '#fa8c16' }} />}
                    title={
                      <Space>
                        {item.title}
                        <Tag
                          color={
                            item.status === 'ongoing'
                              ? 'blue'
                              : item.status === 'transporting'
                              ? 'orange'
                              : item.status === 'arrived'
                              ? 'cyan'
                              : 'green'
                          }
                        >
                          {{
                            pending: '待开始',
                            transporting: '押运中',
                            arrived: '已到达',
                            ongoing: '考试中',
                            collected: '已收卷',
                            returned: '已送返',
                          }[item.status]}
                        </Tag>
                        {item.gpsTrack?.some((p) => p.isAbnormal) && (
                          <Tag color="red" icon={<WarningOutlined />}>
                            GPS异常
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space>
                        <span>负责人: {item.currentHandler}</span>
                        {item.vehicleId && <span>车辆: {item.vehicleId}</span>}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="考点数量"
              value={examSites.length}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="监考老师"
              value={invigilators.length}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="已录入成绩"
              value={scores.length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
