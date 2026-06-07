import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { Candidate, StatisticsData, InvigilationSchedule, Score } from '@/types'

export function exportCandidatesToExcel(candidates: Candidate[], filename: string = '考生信息表.xlsx') {
  const data = candidates.map((c) => ({
    姓名: c.name,
    身份证号: c.idCard,
    报考科目: c.subjects.join(', '),
    生源地: c.origin,
    所在学校: c.school,
    特殊需求: c.specialNeed === 'none' ? '无' : { disability: '残疾', hearing: '听力障碍', visual: '视力障碍', other: '其他' }[c.specialNeed],
    需求详情: c.specialNeedDetail || '',
    状态: { registered: '已报名', assigned: '已排座', absent: '缺考', cheated: '违纪' }[c.status],
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '考生信息')
  XLSX.writeFile(wb, filename)
}

export function exportSchedulesToExcel(schedules: InvigilationSchedule[], filename: string = '监考排班表.xlsx') {
  const data = schedules.map((s) => ({
    日期: s.date,
    时段: { morning: '上午', afternoon: '下午', evening: '晚上' }[s.shift],
    考场ID: s.examRoomId,
    科目ID: s.subjectId,
    角色: s.role === 'lead' ? '主监考' : '副监考',
    状态: { scheduled: '已排定', adjusting: '调班中', completed: '已完成' }[s.status],
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '监考排班')
  XLSX.writeFile(wb, filename)
}

export function exportStatisticsToExcel(data: StatisticsData[], filename: string = '统计分析报告.xlsx') {
  const ws = XLSX.utils.json_to_sheet(
    data.map((d) => ({
      地区: d.region,
      科目: d.subjectName,
      报考人数: d.totalCandidates,
      实考人数: d.attendedCount,
      缺考人数: d.absentCount,
      缺考率: `${(d.absentRate * 100).toFixed(2)}%`,
      违纪人数: d.cheatedCount,
      违纪率: `${(d.cheatedRate * 100).toFixed(2)}%`,
      平均分: d.averageScore,
      最高分: d.maxScore,
      最低分: d.minScore,
      及格率: `${(d.passRate * 100).toFixed(2)}%`,
    }))
  )
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '总体统计')
  XLSX.writeFile(wb, filename)
}

export function exportStatisticsReportToPDF(data: StatisticsData[], filename: string = '质量分析报告.pdf') {
  const doc = new jsPDF()
  doc.setFontSize(18)
  doc.text('职业资格考试质量分析报告', 105, 20, { align: 'center' })
  doc.setFontSize(12)
  doc.text(`生成日期: ${new Date().toLocaleDateString('zh-CN')}`, 14, 32)

  const tableData = data.map((d) => [
    d.region,
    d.subjectName,
    d.totalCandidates.toString(),
    d.attendedCount.toString(),
    `${(d.absentRate * 100).toFixed(2)}%`,
    `${(d.cheatedRate * 100).toFixed(2)}%`,
    d.averageScore.toFixed(2),
    `${(d.passRate * 100).toFixed(2)}%`,
  ])

  autoTable(doc, {
    startY: 42,
    head: [['地区', '科目', '报考', '实考', '缺考率', '违纪率', '平均分', '及格率']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [41, 128, 185] },
  })

  let yOffset = (doc as any).lastAutoTable.finalY + 15
  data.slice(0, 3).forEach((d) => {
    doc.setFontSize(12)
    doc.text(`${d.region} - ${d.subjectName} 分数分布`, 14, yOffset)
    yOffset += 6
    const distData = d.scoreDistribution.map((sd) => [sd.range, sd.count.toString()])
    autoTable(doc, {
      startY: yOffset,
      head: [['分数段', '人数']],
      body: distData,
      styles: { fontSize: 9 },
    })
    yOffset = (doc as any).lastAutoTable.finalY + 10
    if (yOffset > 260) {
      doc.addPage()
      yOffset = 20
    }
  })

  doc.save(filename)
}

export function exportScoresToExcel(scores: Score[], filename: string = '成绩表.xlsx') {
  const data = scores.map((s) => ({
    考生ID: s.candidateId,
    科目ID: s.subjectId,
    初评分数: s.score,
    复评分数: s.crossValidation?.secondScore ?? '-',
    分差: s.crossValidation?.difference ?? '-',
    是否异常: s.isAbnormal ? '是' : '否',
    异常原因: s.abnormalReason || '',
    状态: { draft: '待确认', verified: '已验证', abnormal: '异常待复核', finalized: '已定档' }[s.status],
    录入人: s.enteredBy,
    验证人: s.verifiedBy || '',
  }))
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '成绩信息')
  XLSX.writeFile(wb, filename)
}
