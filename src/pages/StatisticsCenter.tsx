import React, { useMemo } from 'react'
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Space,
  Tag,
  Statistic,
  Empty,
} from 'antd'
import {
  BarChartOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  EnvironmentOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { useAppStore } from '@/store/useAppStore'
import type { StatisticsData } from '@/types'
import ReactECharts from 'echarts-for-react'
import { exportStatisticsToExcel, exportStatisticsReportToPDF } from '@/utils/exporters'

const StatisticsCenter: React.FC = () => {
  const {
    candidates,
    scores,
    examSites,
    examSubjects,
    invigilators,
    arrangements,
  } = useAppStore()

  const statsByRegionAndSubject = useMemo((): StatisticsData[] => {
    const result: StatisticsData[] = []
    const regionMap = new Map<string, Map<string, StatisticsData>>()

    candidates.forEach((c) => {
      const region = c.region
      if (!regionMap.has(region)) regionMap.set(region, new Map())
      c.subjects.forEach((sid) => {
        const subject = examSubjects.find((s) => s.id === sid)
        if (!subject) return
        if (!regionMap.get(region)!.has(sid)) {
          regionMap.get(region)!.set(sid, {
            region,
            subjectId: sid,
            subjectName: subject.name,
            candidateCount: 0,
            avgScore: 0,
            absentCount: 0,
            absentRate: 0,
            cheatCount: 0,
            cheatRate: 0,
          })
        }
        const existing = regionMap.get(region)!.get(sid)!
        existing.candidateCount = (existing.candidateCount || 0) + 1
      })
    })

    const scoreByKey = new Map<string, number[]>()
    scores.forEach((s) => {
      const c = candidates.find((cc) => cc.id === s.candidateId)
      if (!c) return
      const key = `${c.region}-${s.subjectId}`
      if (!scoreByKey.has(key)) scoreByKey.set(key, [])
      scoreByKey.get(key)!.push(s.score)
    })

    regionMap.forEach((subjectMap, region) => {
      subjectMap.forEach((stat, subjectId) => {
        const key = `${region}-${subjectId}`
        const subjectScores = scoreByKey.get(key) || []
        const avgScore = subjectScores.length > 0
          ? subjectScores.reduce((sum, v) => sum + v, 0) / subjectScores.length
          : 0
        const absentCount = (stat.candidateCount || 0) - subjectScores.length
        const absentRate = (stat.candidateCount || 0) > 0 ? absentCount / (stat.candidateCount || 1) : 0
        result.push({
          ...stat,
          totalCandidates: stat.candidateCount!,
          candidateCount: stat.candidateCount,
          avgScore: Number(avgScore.toFixed(2)),
          averageScore: Number(avgScore.toFixed(2)),
          attendedCount: Math.max(0, subjectScores.length),
          absentCount: Math.max(0, absentCount),
          absentRate: Number(Math.max(0, absentRate).toFixed(4)),
          cheatCount: 0,
          cheatedCount: 0,
          cheatRate: 0,
          cheatedRate: 0,
          maxScore: subjectScores.length > 0 ? Math.max(...subjectScores) : 0,
          minScore: subjectScores.length > 0 ? Math.min(...subjectScores) : 0,
          passRate: subjectScores.length > 0
            ? subjectScores.filter((s) => s >= 60).length / subjectScores.length
            : 0,
          scoreDistribution: [
            { range: '0-59', count: subjectScores.filter((s) => s < 60).length },
            { range: '60-69', count: subjectScores.filter((s) => s >= 60 && s < 70).length },
            { range: '70-79', count: subjectScores.filter((s) => s >= 70 && s < 80).length },
            { range: '80-89', count: subjectScores.filter((s) => s >= 80 && s < 90).length },
            { range: '90-100', count: subjectScores.filter((s) => s >= 90).length },
          ],
        })
      })
    })

    return result
  }, [candidates, scores, examSubjects])

  const bySubject = useMemo(() => {
    const map = new Map<string, StatisticsData>()
    examSubjects.forEach((s) => {
      map.set(s.id, {
        region: '全部',
        subjectId: s.id,
        subjectName: s.name,
        candidateCount: 0,
        avgScore: 0,
        absentCount: 0,
        absentRate: 0,
        cheatCount: 0,
        cheatRate: 0,
      })
    })

    candidates.forEach((c) => {
      c.subjects.forEach((sid) => {
        if (map.has(sid)) {
          const stat = map.get(sid)!
          stat.candidateCount = (stat.candidateCount || 0) + 1
        }
      })
    })

    examSubjects.forEach((subject) => {
      const subjectScores = scores.filter((s) => s.subjectId === subject.id)
      const avg = subjectScores.length > 0
        ? subjectScores.reduce((s, v) => s + v.score, 0) / subjectScores.length
        : 0
      if (map.has(subject.id)) {
        const stat = map.get(subject.id)!
        stat.avgScore = Number(avg.toFixed(2))
        stat.absentCount = Math.max(0, (stat.candidateCount || 0) - subjectScores.length)
      }
    })

    return Array.from(map.values())
  }, [candidates, scores, examSubjects])

  const byRegion = useMemo(() => {
    const map = new Map<string, StatisticsData>()
    candidates.forEach((c) => {
      if (!map.has(c.region)) {
        map.set(c.region, {
          region: c.region,
          subjectId: 'all',
          subjectName: '全部科目',
          candidateCount: 0,
          avgScore: 0,
          absentCount: 0,
          absentRate: 0,
          cheatCount: 0,
          cheatRate: 0,
        })
      }
      const stat = map.get(c.region)!
      stat.candidateCount = (stat.candidateCount || 0) + c.subjects.length
    })
    return Array.from(map.values())
  }, [candidates])

  const totalCandidates = candidates.length
  const totalScores = scores.length
  const totalArrangements = arrangements.length
  const totalRooms = examSites.reduce((s, site) => s + site.rooms.length, 0)
  const totalInvigilators = invigilators.length
  const avgScoreOverall = scores.length > 0
    ? Number((scores.reduce((s, v) => s + v.score, 0) / scores.length).toFixed(2))
    : 0

  const barChartOption = useMemo(() => ({
    title: { text: '各科目参考人数', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: bySubject.map((s) => s.subjectName) },
    yAxis: { type: 'value', name: '人数' },
    series: [
      {
        type: 'bar',
        data: bySubject.map((s) => s.candidateCount),
        itemStyle: { color: '#1677ff' },
        barWidth: 28,
        label: { show: true, position: 'top', formatter: '{c}人' },
      },
    ],
  }), [bySubject])

  const avgScoreOption = useMemo(() => ({
    title: { text: '各科目平均分', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: bySubject.map((s) => s.subjectName) },
    yAxis: { type: 'value', name: '分数', min: 0, max: 100 },
    series: [
      {
        type: 'bar',
        data: bySubject.map((s) => s.avgScore),
        itemStyle: { color: '#52c41a' },
        barWidth: 28,
        label: { show: true, position: 'top', formatter: '{c}分' },
        markLine: {
          data: [{ type: 'average', name: '总平均' }],
        },
      },
    ],
  }), [bySubject])

  const pieChartOption = useMemo(() => {
    const data = byRegion.map((r) => ({
      name: r.region,
      value: r.candidateCount,
    }))
    return {
      title: { text: '各地区考生分布', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { orient: 'vertical', left: 'left', top: 30 },
      series: [
        {
          type: 'pie',
          radius: ['40%', '65%'],
          center: ['60%', '55%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, formatter: '{b}\n{d}%' },
          data,
        },
      ],
    }
  }, [byRegion])

  const regionScoreOption = useMemo(() => {
    const regions = [...new Set(statsByRegionAndSubject.map((s) => s.region))]
    const series = examSubjects.map((subject) => ({
      name: subject.name,
      type: 'bar',
      stack: 'total',
      data: regions.map((region) => {
        const stat = statsByRegionAndSubject.find(
          (s) => s.region === region && s.subjectId === subject.id
        )
        return stat?.candidateCount || 0
      }),
    }))
    return {
      title: { text: '各地区各科目人数', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0 },
      grid: { left: 50, right: 20, top: 40, bottom: 50 },
      xAxis: { type: 'category', data: regions },
      yAxis: { type: 'value', name: '人数' },
      series,
    }
  }, [statsByRegionAndSubject, examSubjects])

  const tableColumns = [
    {
      title: '地区',
      dataIndex: 'region',
      width: 120,
    },
    {
      title: '科目',
      dataIndex: 'subjectName',
      width: 140,
    },
    {
      title: '参考人数',
      dataIndex: 'candidateCount',
      width: 100,
      render: (v: number) => <strong>{v}</strong>,
    },
    {
      title: '平均分',
      dataIndex: 'avgScore',
      width: 100,
      render: (v: number) => (v > 0 ? <Tag color="blue">{v} 分</Tag> : '-'),
    },
    {
      title: '缺考人数',
      dataIndex: 'absentCount',
      width: 100,
    },
    {
      title: '缺考率',
      dataIndex: 'absentRate',
      width: 120,
      render: (v: number) => {
        const pct = (v * 100).toFixed(2)
        const color = v > 0.1 ? 'red' : v > 0.05 ? 'orange' : 'green'
        return <Tag color={color}>{pct}%</Tag>
      },
    },
    {
      title: '作弊人数',
      dataIndex: 'cheatCount',
      width: 100,
    },
    {
      title: '作弊率',
      dataIndex: 'cheatRate',
      width: 120,
      render: (v: number) => {
        const pct = (v * 100).toFixed(2)
        return <Tag color={v > 0 ? 'red' : 'green'}>{pct}%</Tag>
      },
    },
  ]

  const HeatmapSvg: React.FC = () => {
    const invPerSite = examSites.map((site) => {
      const siteArrangements = arrangements.filter(
        (a) => site.rooms.some((r) => r.id === a.examRoomId)
      )
      const totalSeats = siteArrangements.reduce(
        (s, a) => s + a.assignments.length,
        0
      )
      const totalCapacity = site.rooms.reduce((s, r) => s + r.capacity, 0)
      const invCount = invigilators.filter((i) => i.examSiteId === site.id).length
      return {
        site,
        seatUsed: totalSeats,
        capacity: totalCapacity,
        usage: totalCapacity > 0 ? totalSeats / totalCapacity : 0,
        invCount,
      }
    })

    const heatColor = (ratio: number) => {
      if (ratio >= 0.8) return '#ff4d4f'
      if (ratio >= 0.5) return '#faad14'
      if (ratio >= 0.3) return '#1677ff'
      return '#52c41a'
    }

    return (
      <svg viewBox="0 0 600 340" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="legendGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#52c41a" />
            <stop offset="33%" stopColor="#1677ff" />
            <stop offset="66%" stopColor="#faad14" />
            <stop offset="100%" stopColor="#ff4d4f" />
          </linearGradient>
        </defs>

        <rect x="10" y="10" width="580" height="320" fill="#fafafa" rx="8" stroke="#e8e8e8" />

        <text x="30" y="40" fontSize="14" fill="#333" fontWeight="bold">
          🗺️  考场占用与监考人员分布热力图
        </text>

        {invPerSite.map((item, idx) => {
          const row = Math.floor(idx / 3)
          const col = idx % 3
          const x = 40 + col * 185
          const y = 70 + row * 110
          const w = 160
          const h = 90
          const fill = heatColor(item.usage)
          return (
            <g key={item.site.id}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={10}
                fill={fill}
                fillOpacity={0.2 + item.usage * 0.6}
                stroke={fill}
                strokeWidth={2}
              />
              <circle
                cx={x + w / 2}
                cy={y + 18}
                r={22}
                fill={fill}
                fillOpacity={0.9}
              />
              <text
                x={x + w / 2}
                y={y + 23}
                textAnchor="middle"
                fontSize="16"
                fill="#fff"
                fontWeight="bold"
              >
                {item.site.name.slice(0, 2)}
              </text>
              <text
                x={x + w / 2}
                y={y + 50}
                textAnchor="middle"
                fontSize="11"
                fill="#333"
                fontWeight="500"
              >
                {item.site.name}
              </text>
              <text
                x={x + w / 2}
                y={y + 66}
                textAnchor="middle"
                fontSize="10"
                fill="#666"
              >
                考生 {item.seatUsed}/{item.capacity} | 监考 {item.invCount}人
              </text>
              <text
                x={x + w / 2}
                y={y + 82}
                textAnchor="middle"
                fontSize="11"
                fill={fill}
                fontWeight="600"
              >
                占用 {Math.round(item.usage * 100)}%
              </text>
            </g>
          )
        })}

        <text x="30" y="315" fontSize="11" fill="#666">
          考场占用率图例：
        </text>
        <rect x="130" y="306" width="200" height="10" fill="url(#legendGrad)" rx="3" />
        <text x="340" y="315" fontSize="11" fill="#666">
          低 (0%)
        </text>
        <text x="520" y="315" fontSize="11" fill="#666">
          高 (100%)
        </text>
      </svg>
    )
  }

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic
              title="考生总数"
              value={totalCandidates}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="成绩记录"
              value={totalScores}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="整体平均分"
              value={avgScoreOverall}
              suffix="分"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="考场编排数"
              value={totalArrangements}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="考场总数"
              value={totalRooms}
              prefix={<EnvironmentOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="监考人员"
              value={totalInvigilators}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card
            title="📊 各科目参考人数"
            extra={
              <Space>
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={() => exportStatisticsToExcel(statsByRegionAndSubject)}
                >
                  导出Excel
                </Button>
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={() => exportStatisticsReportToPDF(statsByRegionAndSubject)}
                >
                  导出报告
                </Button>
              </Space>
            }
          >
            <ReactECharts option={barChartOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="📈 各科目平均分对比">
            <ReactECharts option={avgScoreOption} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={10}>
          <Card title="🥧 地区考生分布">
            <ReactECharts option={pieChartOption} style={{ height: 340 }} />
          </Card>
        </Col>
        <Col span={14}>
          <Card title="🗺️ 考场占用与监考热力图（SVG示意图）">
            <HeatmapSvg />
          </Card>
        </Col>
      </Row>

      <Card
        title="📋 地区×科目 交叉统计表"
        style={{ marginTop: 16 }}
        extra={
          <Space>
            <Tag color="blue">真实数据动态计算</Tag>
          </Space>
        }
      >
        {statsByRegionAndSubject.length > 0 ? (
          <Table
            columns={tableColumns}
            dataSource={statsByRegionAndSubject}
            rowKey={(r) => `${r.region}-${r.subjectId}`}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 900 }}
          />
        ) : (
          <Empty description="暂无统计数据" style={{ padding: 40 }} />
        )}
      </Card>
    </div>
  )
}

export default StatisticsCenter
