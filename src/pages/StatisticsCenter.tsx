import React, { useState, useMemo, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Space,
  Tag,
  Select,
  Tabs,
  Statistic,
  Progress,
  Empty,
  Radio,
} from 'antd'
import {
  BarChartOutlined,
  ExportOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import { exportStatisticsToExcel, exportStatisticsReportToPDF } from '@/utils/exporters'
import ReactECharts from 'echarts-for-react'
import type { HeatmapPoint } from '@/types'

const { Option } = Select

const StatisticsCenter: React.FC = () => {
  const { getStatisticsByRegionAndSubject, examSites, arrangements, invigilators, schedules, getHeatmapData } =
    useAppStore()

  const [filterRegion, setFilterRegion] = useState<string | undefined>()
  const [filterSubject, setFilterSubject] = useState<string | undefined>()
  const [heatmapType, setHeatmapType] = useState<'room_usage' | 'invigilator_density'>('room_usage')

  const allStats = useMemo(() => getStatisticsByRegionAndSubject(), [getStatisticsByRegionAndSubject])
  const heatmapData = useMemo(() => getHeatmapData(), [getHeatmapData])

  const filteredStats = useMemo(() => {
    return allStats.filter((s) => {
      if (filterRegion && s.region !== filterRegion) return false
      if (filterSubject && s.subjectName !== filterSubject) return false
      return true
    })
  }, [allStats, filterRegion, filterSubject])

  const regions = [...new Set(allStats.map((s) => s.region))]
  const subjects = [...new Set(allStats.map((s) => s.subjectName))]

  const summary = useMemo(() => {
    const total = filteredStats.reduce((sum, s) => sum + s.totalCandidates, 0)
    const attended = filteredStats.reduce((sum, s) => sum + s.attendedCount, 0)
    const cheated = filteredStats.reduce((sum, s) => sum + s.cheatedCount, 0)
    const avgScore =
      filteredStats.length > 0
        ? filteredStats.reduce((sum, s) => sum + s.averageScore, 0) / filteredStats.length
        : 0
    const avgPass =
      filteredStats.length > 0
        ? filteredStats.reduce((sum, s) => sum + s.passRate, 0) / filteredStats.length
        : 0
    return {
      total,
      attended,
      absent: total - attended,
      cheated,
      avgScore: Math.round(avgScore * 100) / 100,
      avgPass: Math.round(avgPass * 10000) / 100,
    }
  }, [filteredStats])

  const barOption = useMemo(() => {
    const regionsData = [...new Set(filteredStats.map((s) => s.region))]
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['报考人数', '实考人数', '缺考人数'], bottom: 0 },
      grid: { left: 40, right: 20, top: 20, bottom: 50 },
      xAxis: {
        type: 'category',
        data: regionsData,
        axisLabel: { rotate: 20 },
      },
      yAxis: { type: 'value' },
      series: [
        {
          name: '报考人数',
          type: 'bar',
          data: regionsData.map((r) =>
            filteredStats.filter((s) => s.region === r).reduce((sum, s) => sum + s.totalCandidates, 0)
          ),
          itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '实考人数',
          type: 'bar',
          data: regionsData.map((r) =>
            filteredStats.filter((s) => s.region === r).reduce((sum, s) => sum + s.attendedCount, 0)
          ),
          itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '缺考人数',
          type: 'bar',
          data: regionsData.map((r) =>
            filteredStats.filter((s) => s.region === r).reduce((sum, s) => sum + s.absentCount, 0)
          ),
          itemStyle: { color: '#ff4d4f', borderRadius: [4, 4, 0, 0] },
        },
      ],
    }
  }, [filteredStats])

  const pieOption = useMemo(() => {
    const subjectData = subjects.map((sn) => ({
      name: sn,
      value: filteredStats.filter((s) => s.subjectName === sn).reduce((sum, s) => sum + s.totalCandidates, 0),
    })).filter((d) => d.value > 0)

    return {
      tooltip: { trigger: 'item' },
      legend: { type: 'scroll', bottom: 0 },
      series: [
        {
          name: '科目报考分布',
          type: 'pie',
          radius: ['35%', '65%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 8,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold' },
          },
          data: subjectData,
        },
      ],
    }
  }, [filteredStats, subjects])

  const scoreDistOption = useMemo(() => {
    const ranges = ['0-59', '60-69', '70-79', '80-89', '90-100']
    const aggregated = ranges.map((r) => {
      let count = 0
      filteredStats.forEach((s) => {
        const dist = s.scoreDistribution.find((d) => d.range === r)
        if (dist) count += dist.count
      })
      return count
    })

    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'category', data: ranges },
      yAxis: { type: 'value' },
      series: [
        {
          type: 'bar',
          data: aggregated,
          barWidth: '50%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: '#722ed1' },
                { offset: 1, color: '#b37feb' },
              ],
            },
            borderRadius: [8, 8, 0, 0],
          },
          label: { show: true, position: 'top' },
        },
      ],
    }
  }, [filteredStats])

  const rateCompareOption = useMemo(() => {
    const regionsData = [...new Set(filteredStats.map((s) => s.region))]
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['缺考率(%)', '违纪率(%)', '及格率(%)'], bottom: 0 },
      grid: { left: 40, right: 40, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: regionsData, axisLabel: { rotate: 20 } },
      yAxis: [
        { type: 'value', name: '百分比(%)', max: 100 },
      ],
      series: [
        {
          name: '缺考率(%)',
          type: 'line',
          smooth: true,
          data: regionsData.map((r) => {
            const stats = filteredStats.filter((s) => s.region === r)
            const avg = stats.length > 0 ? stats.reduce((sum, s) => sum + s.absentRate, 0) / stats.length : 0
            return Math.round(avg * 10000) / 100
          }),
          itemStyle: { color: '#ff4d4f' },
          areaStyle: { opacity: 0.2 },
        },
        {
          name: '违纪率(%)',
          type: 'line',
          smooth: true,
          data: regionsData.map((r) => {
            const stats = filteredStats.filter((s) => s.region === r)
            const avg = stats.length > 0 ? stats.reduce((sum, s) => sum + s.cheatedRate, 0) / stats.length : 0
            return Math.round(avg * 10000) / 100
          }),
          itemStyle: { color: '#fa8c16' },
          areaStyle: { opacity: 0.2 },
        },
        {
          name: '及格率(%)',
          type: 'line',
          smooth: true,
          data: regionsData.map((r) => {
            const stats = filteredStats.filter((s) => s.region === r)
            const avg = stats.length > 0 ? stats.reduce((sum, s) => sum + s.passRate, 0) / stats.length : 0
            return Math.round(avg * 10000) / 100
          }),
          itemStyle: { color: '#52c41a' },
          areaStyle: { opacity: 0.2 },
        },
      ],
    }
  }, [filteredStats])

  const columns = [
    { title: '地区', dataIndex: 'region', width: 100, fixed: 'left' as const },
    { title: '科目', dataIndex: 'subjectName', width: 120 },
    { title: '报考人数', dataIndex: 'totalCandidates', width: 100, sorter: (a: any, b: any) => a.totalCandidates - b.totalCandidates },
    { title: '实考人数', dataIndex: 'attendedCount', width: 100 },
    {
      title: '缺考率',
      dataIndex: 'absentRate',
      width: 120,
      render: (v: number) => (
        <Progress
          percent={Math.round(v * 10000) / 100}
          size="small"
          status={v > 0.1 ? 'exception' : 'normal'}
          format={(p) => `${p}%`}
        />
      ),
    },
    {
      title: '违纪率',
      dataIndex: 'cheatedRate',
      width: 120,
      render: (v: number) => (
        <Progress
          percent={Math.round(v * 10000) / 100}
          size="small"
          status={v > 0.05 ? 'exception' : 'active'}
          format={(p) => `${p}%`}
        />
      ),
    },
    {
      title: '平均分',
      dataIndex: 'averageScore',
      width: 100,
      render: (v: number) => <strong>{v}</strong>,
      sorter: (a: any, b: any) => a.averageScore - b.averageScore,
    },
    { title: '最高分', dataIndex: 'maxScore', width: 90 },
    { title: '最低分', dataIndex: 'minScore', width: 90 },
    {
      title: '及格率',
      dataIndex: 'passRate',
      width: 120,
      render: (v: number) => (
        <Progress
          percent={Math.round(v * 10000) / 100}
          size="small"
          strokeColor={v > 0.7 ? '#52c41a' : '#fa8c16'}
          format={(p) => `${p}%`}
        />
      ),
    },
  ]

  const mapPoints: HeatmapPoint[] = heatmapData.filter((p) => p.type === heatmapType)

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="报考总人数"
              value={summary.total}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="实考人数"
              value={summary.attended}
              valueStyle={{ color: '#52c41a' }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="缺考人数"
              value={summary.absent}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<FallOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="违纪人数"
              value={summary.cheated}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="综合平均分"
              value={summary.avgScore}
              valueStyle={{ color: '#722ed1' }}
              precision={2}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="综合及格率"
              value={summary.avgPass}
              suffix="%"
              valueStyle={{ color: '#13c2c2' }}
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="统计筛选与导出"
        style={{ marginBottom: 16 }}
        extra={
          <Space>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => exportStatisticsToExcel(filteredStats)}
            >
              导出Excel
            </Button>
            <Button
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={() => exportStatisticsReportToPDF(filteredStats)}
            >
              导出PDF报告
            </Button>
          </Space>
        }
      >
        <Space wrap>
          <Select
            placeholder="筛选地区"
            allowClear
            style={{ width: 160 }}
            value={filterRegion}
            onChange={setFilterRegion}
          >
            {regions.map((r) => (
              <Option key={r} value={r}>
                {r}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="筛选科目"
            allowClear
            style={{ width: 160 }}
            value={filterSubject}
            onChange={setFilterSubject}
          >
            {subjects.map((s) => (
              <Option key={s} value={s}>
                {s}
              </Option>
            ))}
          </Select>
        </Space>
      </Card>

      <Tabs
        defaultActiveKey="charts"
        items={[
          {
            key: 'charts',
            label: (
              <span>
                <BarChartOutlined /> 图表分析
              </span>
            ),
            children: (
              <>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Card title="各地区报考/实考/缺考人数对比" size="small">
                      <ReactECharts option={barOption} style={{ height: 320 }} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="各科目报考人数分布" size="small">
                      <ReactECharts option={pieOption} style={{ height: 320 }} />
                    </Card>
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={12}>
                    <Card title="分数段分布统计" size="small">
                      <ReactECharts option={scoreDistOption} style={{ height: 320 }} />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title="各地区缺考率/违纪率/及格率对比" size="small">
                      <ReactECharts option={rateCompareOption} style={{ height: 320 }} />
                    </Card>
                  </Col>
                </Row>
                <Card
                  title={
                    <Space>
                      <EnvironmentOutlined />
                      考点实时热力分布地图
                      <Radio.Group
                        value={heatmapType}
                        onChange={(e) => setHeatmapType(e.target.value)}
                        size="small"
                      >
                        <Radio.Button value="room_usage">考场占用</Radio.Button>
                        <Radio.Button value="invigilator_density">监考密度</Radio.Button>
                      </Radio.Group>
                    </Space>
                  }
                >
                  <div className="map-container">
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <svg width="100%" height="100%" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid slice">
                        <defs>
                          <radialGradient id="heatGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#ff0000" stopOpacity="0.9" />
                            <stop offset="20%" stopColor="#ff6600" stopOpacity="0.7" />
                            <stop offset="40%" stopColor="#ffcc00" stopOpacity="0.5" />
                            <stop offset="60%" stopColor="#99ff00" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#0066ff" stopOpacity="0.1" />
                          </radialGradient>
                          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />

                        {examSites.map((site, idx) => {
                          const x = 100 + idx * 150 + (idx % 2) * 30
                          const y = 80 + (idx % 3) * 140
                          const intensity = mapPoints.find(
                            (p) => Math.abs(p.lat - site.lat) < 0.01 && Math.abs(p.lng - site.lng) < 0.01
                          )?.value || 0
                          const radius = 30 + intensity * 8
                          return (
                            <g key={site.id}>
                              <circle
                                cx={x}
                                cy={y}
                                r={radius}
                                fill="url(#heatGrad)"
                                opacity={0.6}
                              >
                                <animate
                                  attributeName="r"
                                  values={`${radius};${radius + 10};${radius}`}
                                  dur="3s"
                                  repeatCount="indefinite"
                                />
                                <animate
                                  attributeName="opacity"
                                  values="0.6;0.8;0.6"
                                  dur="3s"
                                  repeatCount="indefinite"
                                />
                              </circle>
                              <circle cx={x} cy={y} r={8} fill="#fff" stroke="#1677ff" strokeWidth={2} />
                              <text x={x} y={y - radius - 8} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                                {site.name}
                              </text>
                              <text x={x} y={y + 4} textAnchor="middle" fill="#1677ff" fontSize="10" fontWeight="bold">
                                {intensity}
                              </text>
                              <text x={x} y={y + radius + 16} textAnchor="middle" fill="#fff" fontSize="11">
                                {heatmapType === 'room_usage' ? `${intensity}个考场` : `${intensity}名监考`}
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                      <div
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          background: 'rgba(0,0,0,0.5)',
                          padding: '8px 12px',
                          borderRadius: 4,
                          color: '#fff',
                          fontSize: 12,
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: 6 }}>
                          {heatmapType === 'room_usage' ? '考场占用热力图' : '监考人员热力图'}
                        </div>
                        <div className="heatmap-legend">
                          <span>低</span>
                          <div className="legend-gradient"></div>
                          <span>高</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            ),
          },
          {
            key: 'table',
            label: (
              <span>
                <BarChartOutlined /> 数据明细
              </span>
            ),
            children: filteredStats.length > 0 ? (
              <Table
                columns={columns}
                dataSource={filteredStats}
                rowKey={(r) => `${r.region}-${r.subjectId}`}
                scroll={{ x: 1200 }}
                pagination={{ pageSize: 10, showSizeChanger: true }}
              />
            ) : (
              <Empty description="暂无数据" style={{ padding: 60 }} />
            ),
          },
        ]}
      />
    </div>
  )
}

export default StatisticsCenter
