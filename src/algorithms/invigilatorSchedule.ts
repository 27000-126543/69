import { v4 as uuidv4 } from 'uuid'
import type {
  Invigilator,
  ExamSite,
  ExamSubject,
  RoomArrangement,
  InvigilationSchedule,
} from '@/types'

export interface SchedulingConstraints {
  maxDailyWorkHours: number
  maxWeeklyWorkHours: number
  fairRotation: boolean
  requireSubjectQualification: boolean
  minRestHours: number
}

export interface SchedulingResult {
  schedules: InvigilationSchedule[]
  unscheduledArrangements: RoomArrangement[]
  warnings: string[]
  stats: {
    totalSlots: number
    assignedCount: number
    leadCount: number
    assistantCount: number
    overloadCount: number
  }
}

export function generateInvigilationSchedule(
  invigilators: Invigilator[],
  arrangements: RoomArrangement[],
  examSites: ExamSite[],
  examSubjects: ExamSubject[],
  constraints: SchedulingConstraints
): SchedulingResult {
  const warnings: string[] = []
  const schedules: InvigilationSchedule[] = []
  const unscheduledArrangements: RoomArrangement[] = []

  const invigilatorWorkload = new Map<string, { daily: Map<string, number>; weekly: number; recentSites: Set<string> }>()
  invigilators.forEach((inv) => {
    invigilatorWorkload.set(inv.id, {
      daily: new Map(),
      weekly: inv.workHours,
      recentSites: new Set(),
    })
  })

  const sortedArrangements = [...arrangements].sort((a, b) => {
    const subjectA = examSubjects.find((s) => s.id === a.subjectId)
    const subjectB = examSubjects.find((s) => s.id === b.subjectId)
    const specialA = a.assignments.some((as) => as.isSpecial) ? 1 : 0
    const specialB = b.assignments.some((as) => as.isSpecial) ? 1 : 0
    if (specialA !== specialB) return specialB - specialA
    return (subjectB?.duration || 0) - (subjectA?.duration || 0)
  })

  for (const arrangement of sortedArrangements) {
    const subject = examSubjects.find((s) => s.id === arrangement.subjectId)
    if (!subject) {
      unscheduledArrangements.push(arrangement)
      continue
    }

    const shift: 'morning' | 'afternoon' | 'evening' =
      subject.startTime < '12:00' ? 'morning' : subject.startTime < '17:00' ? 'afternoon' : 'evening'

    const roomSite = examSites.find((s) => s.rooms.some((r) => r.id === arrangement.examRoomId))
    if (!roomSite) {
      unscheduledArrangements.push(arrangement)
      continue
    }

    const slotsNeeded = arrangement.assignments.length > 20 ? 2 : 2

    const candidates = invigilators
      .filter((inv) => {
        if (inv.status !== 'available') return false
        if (constraints.requireSubjectQualification && !inv.qualifiedSubjects.includes(arrangement.subjectId)) return false
        if (inv.violationRecords > 0) return false

        const workload = invigilatorWorkload.get(inv.id)!
        const todayHours = workload.daily.get(arrangement.date) || 0
        if (todayHours + subject.duration / 60 > constraints.maxDailyWorkHours) return false
        if (workload.weekly + subject.duration / 60 > constraints.maxWeeklyWorkHours) return false

        if (roomSite.region && inv.region !== roomSite.region) {
        }

        return true
      })
      .map((inv) => {
        const workload = invigilatorWorkload.get(inv.id)!
        let score = 0
        if (constraints.fairRotation) {
          score += (1 - inv.fairRotationScore) * 40
          score += (1 - inv.pastInvigilationCount / 20) * 30
        }
        score += (1 - workload.weekly / constraints.maxWeeklyWorkHours) * 30
        return { invigilator: inv, score }
      })
      .sort((a, b) => b.score - a.score)

    const assignedForThisArrangement: string[] = []

    for (let i = 0; i < slotsNeeded && i < candidates.length; i++) {
      const { invigilator } = candidates[i]
      const role: 'lead' | 'assistant' = i === 0 ? 'lead' : 'assistant'

      const workload = invigilatorWorkload.get(invigilator.id)!
      const currentDaily = workload.daily.get(arrangement.date) || 0
      workload.daily.set(arrangement.date, currentDaily + subject.duration / 60)
      workload.weekly += subject.duration / 60

      schedules.push({
        id: uuidv4(),
        invigilatorId: invigilator.id,
        examRoomId: arrangement.examRoomId,
        subjectId: arrangement.subjectId,
        date: arrangement.date,
        shift,
        role,
        status: 'scheduled',
      })

      assignedForThisArrangement.push(invigilator.id)
    }

    if (assignedForThisArrangement.length < slotsNeeded) {
      warnings.push(
        `考场 ${arrangement.examRoomId.slice(0, 8)} 科目 ${subject.name} 仅安排 ${assignedForThisArrangement.length}/${slotsNeeded} 名监考`
      )
    }
  }

  let overloadCount = 0
  invigilatorWorkload.forEach((wl, id) => {
    if (wl.weekly > constraints.maxWeeklyWorkHours * 0.9) {
      overloadCount++
    }
  })

  return {
    schedules,
    unscheduledArrangements,
    warnings,
    stats: {
      totalSlots: arrangements.length * 2,
      assignedCount: schedules.length,
      leadCount: schedules.filter((s) => s.role === 'lead').length,
      assistantCount: schedules.filter((s) => s.role === 'assistant').length,
      overloadCount,
    },
  }
}
