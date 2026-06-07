import { v4 as uuidv4 } from 'uuid'
import type {
  Candidate,
  ExamSite,
  ExamRoom,
  ExamSubject,
  SeatAssignment,
  RoomArrangement,
} from '@/types'

export interface ArrangementConstraints {
  minSeatSpacing: number
  avoidSameSchool: boolean
  avoidTimeConflict: boolean
  specialAccessibility: boolean
}

export interface ArrangementResult {
  arrangements: RoomArrangement[]
  unassignedCandidates: Candidate[]
  warnings: string[]
  stats: {
    totalCandidates: number
    assignedCount: number
    specialAssignedCount: number
    conflictCount: number
  }
}

export function generateRoomArrangement(
  candidates: Candidate[],
  examSites: ExamSite[],
  examSubjects: ExamSubject[],
  constraints: ArrangementConstraints
): ArrangementResult {
  const warnings: string[] = []
  const arrangements: RoomArrangement[] = []
  const assignedCandidateIds = new Set<string>()

  const subjectTimeMap = new Map<string, { date: string; start: string; end: string }>()
  examSubjects.forEach((s) => {
    subjectTimeMap.set(s.id, { date: s.date, start: s.startTime, end: s.endTime })
  })

  const roomUsageMap = new Map<string, Set<string>>()
  examSites.forEach((site) => {
    site.rooms.forEach((room) => {
      roomUsageMap.set(room.id, new Set())
    })
  })

  const sortedCandidates = [...candidates].sort((a, b) => {
    const aSpecial = a.specialNeed !== 'none' ? 1 : 0
    const bSpecial = b.specialNeed !== 'none' ? 1 : 0
    if (aSpecial !== bSpecial) return bSpecial - aSpecial
    return b.subjects.length - a.subjects.length
  })

  for (const candidate of sortedCandidates) {
    for (const subjectId of candidate.subjects) {
      const subject = examSubjects.find((s) => s.id === subjectId)
      if (!subject) continue

      if (assignedCandidateIds.has(`${candidate.id}-${subjectId}`)) continue

      const suitableRooms: { site: ExamSite; room: ExamRoom }[] = []

      for (const site of examSites) {
        for (const room of site.rooms) {
          if (!room.isActive) continue
          if (candidate.specialNeed !== 'none' && !room.hasAccessibility && constraints.specialAccessibility) continue
          if (candidate.specialNeed === 'none' && room.layout === 'special') continue

          const usageSet = roomUsageMap.get(room.id)!
          if (usageSet.has(subjectId)) continue

          let timeConflict = false
          for (const usedSubjId of usageSet) {
            if (constraints.avoidTimeConflict) {
              const t1 = subjectTimeMap.get(subjectId)!
              const t2 = subjectTimeMap.get(usedSubjId)!
              if (t1.date === t2.date && !(t1.end <= t2.start || t2.end <= t1.start)) {
                timeConflict = true
                break
              }
            }
          }
          if (timeConflict) continue

          suitableRooms.push({ site, room })
        }
      }

      if (suitableRooms.length === 0) {
        warnings.push(`考生 ${candidate.name} (${candidate.idCard}) 无法安排科目 ${subject.name}`)
        continue
      }

      suitableRooms.sort((a, b) => {
        const aUsage = roomUsageMap.get(a.room.id)!.size
        const bUsage = roomUsageMap.get(b.room.id)!.size
        return aUsage - bUsage
      })

      let assigned = false
      for (const { room } of suitableRooms) {
        let arrangement = arrangements.find(
          (a) => a.examRoomId === room.id && a.subjectId === subjectId
        )

        if (!arrangement) {
          arrangement = {
            id: uuidv4(),
            examRoomId: room.id,
            subjectId,
            date: subject.date,
            assignments: [],
            invigilators: [],
            approvalStatus: 'pending',
          }
          arrangements.push(arrangement)
          roomUsageMap.get(room.id)!.add(subjectId)
        }

        if (arrangement.assignments.length >= room.capacity) continue

        if (constraints.avoidSameSchool) {
          const sameSchoolCount = arrangement.assignments.filter((a) => {
            const c = candidates.find((cc) => cc.id === a.candidateId)
            return c && c.school === candidate.school
          }).length
          if (sameSchoolCount >= 2) continue
        }

        const seats = generateSeatPosition(arrangement.assignments, room, constraints)
        if (!seats) continue

        const assignment: SeatAssignment = {
          id: uuidv4(),
          candidateId: candidate.id,
          examRoomId: room.id,
          seatNumber: arrangement.assignments.length + 1,
          subjectId,
          row: seats.row,
          col: seats.col,
          isSpecial: candidate.specialNeed !== 'none',
        }

        arrangement.assignments.push(assignment)
        assignedCandidateIds.add(`${candidate.id}-${subjectId}`)
        assigned = true
        break
      }

      if (!assigned) {
        warnings.push(`考生 ${candidate.name} 科目 ${subject.name} 未能安排座位`)
      }
    }
  }

  const unassignedCandidates = candidates.filter(
    (c) => !c.subjects.every((s) => assignedCandidateIds.has(`${c.id}-${s}`))
  )

  const specialAssignedCount = arrangements.reduce(
    (sum, a) => sum + a.assignments.filter((as) => as.isSpecial).length,
    0
  )

  return {
    arrangements,
    unassignedCandidates,
    warnings,
    stats: {
      totalCandidates: candidates.length,
      assignedCount: assignedCandidateIds.size,
      specialAssignedCount,
      conflictCount: 0,
    },
  }
}

function generateSeatPosition(
  existing: SeatAssignment[],
  room: ExamRoom,
  constraints: ArrangementConstraints
): { row: number; col: number } | null {
  const cols = 5
  const rows = Math.ceil(room.capacity / cols)
  const occupied = new Set<string>()
  existing.forEach((e) => occupied.add(`${e.row}-${e.col}`))

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const key = `${r}-${c}`
      if (occupied.has(key)) continue

      if (constraints.minSeatSpacing > 0) {
        let valid = true
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue
            if (occupied.has(`${r + dr}-${c + dc}`)) {
              valid = false
              break
            }
          }
          if (!valid) break
        }
        if (!valid) continue
      }

      return { row: r, col: c }
    }
  }

  return null
}
