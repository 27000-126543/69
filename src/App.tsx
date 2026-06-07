import React, { useEffect, useState } from 'react'
import { Layout, Menu, Avatar, Dropdown, Badge } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  AuditOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  CarOutlined,
  TeamOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import Dashboard from '@/pages/Dashboard'
import CandidateManagement from '@/pages/CandidateManagement'
import RoomArrangement from '@/pages/RoomArrangement'
import ApprovalCenter from '@/pages/ApprovalCenter'
import ExamTaskMonitoring from '@/pages/ExamTaskMonitoring'
import InvigilatorSchedule from '@/pages/InvigilatorSchedule'
import ScoreManagement from '@/pages/ScoreManagement'
import StatisticsCenter from '@/pages/StatisticsCenter'

const { Sider, Header, Content } = Layout

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '系统总览' },
  { key: '/candidates', icon: <UserOutlined />, label: '考生管理' },
  { key: '/arrangement', icon: <AuditOutlined />, label: '考场编排' },
  { key: '/approvals', icon: <CheckCircleOutlined />, label: '审批中心' },
  { key: '/tasks', icon: <CarOutlined />, label: '考务监控' },
  { key: '/invigilators', icon: <TeamOutlined />, label: '监考排班' },
  { key: '/scores', icon: <FileTextOutlined />, label: '成绩管理' },
  { key: '/statistics', icon: <BarChartOutlined />, label: '统计分析' },
]

const App: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, approvals, initMockData, examTasks } = useAppStore()
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!initialized) {
      initMockData()
      setInitialized(true)
    }
  }, [initialized, initMockData])

  const pendingCount = approvals.filter((a) => a.status === 'pending').length
  const abnormalTaskCount = examTasks.filter(
    (t) => t.gpsTrack?.some((p) => p.isAbnormal)
  ).length

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
      },
    ],
  }

  return (
    <Layout className="app-layout">
      <Sider width={220} className="app-sider" theme="dark">
        <div className="app-logo">
          职业资格考试<br />考务智能调度系统
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 500 }}>
            {menuItems.find((m) => m.key === location.pathname)?.label || '系统总览'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Badge count={pendingCount} offset={[-2, 2]}>
              <CheckCircleOutlined
                style={{ fontSize: 20, color: '#52c41a', cursor: 'pointer' }}
                onClick={() => navigate('/approvals')}
              />
            </Badge>
            <Badge count={abnormalTaskCount} offset={[-2, 2]}>
              <ExclamationCircleOutlined
                style={{ fontSize: 20, color: '#ff4d4f', cursor: 'pointer' }}
                onClick={() => navigate('/tasks')}
              />
            </Badge>
            <Dropdown menu={userMenu}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>
                  {currentUser.name} ({currentUser.role === 'admin' ? '系统管理员' : currentUser.role})
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/candidates" element={<CandidateManagement />} />
            <Route path="/arrangement" element={<RoomArrangement />} />
            <Route path="/approvals" element={<ApprovalCenter />} />
            <Route path="/tasks" element={<ExamTaskMonitoring />} />
            <Route path="/invigilators" element={<InvigilatorSchedule />} />
            <Route path="/scores" element={<ScoreManagement />} />
            <Route path="/statistics" element={<StatisticsCenter />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
