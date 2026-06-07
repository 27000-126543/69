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

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function hasTimeConflict(
  s1: ExamSubject,
  s2: ExamSubject
): boolean {
  if (s1.date !== s2.date) return false
  const start1 = timeToMinutes(s1.startTime)
  const end1 = timeToMinutes(s1.endTime)
  const start2 = timeToMinutes(s2.startTime)
  const end2 = timeToMinutes(s2.endTime)
  return !(end1 <= start2 || end2 <= start1)
}

export function generateRoomArrangement(
  candidates: Candidate[],
  examSites: ExamSite[],
  examSubjects: ExamSubject[],
  constraints: ArrangementConstraints
): ArrangementResult {
  const warnings: string[] = []
  const arrangements: RoomArrangement[] = []
  const assignedPairs = new Set<string>()
  let conflictCount = 0

  const subjectMap = new Map<string, ExamSubject>()
  examSubjects.forEach((s) => subjectMap.set(s.id, s))

  const candidateSubjectTimeMap = new Map<string, Map<string, ExamSubject>>()
  candidates.forEach((c) => {
    const m = new Map<string, ExamSubject>()
    c.subjects.forEach((sid) => {
      const s = subjectMap.get(sid)
      if (s) m.set(sid, s)
    })
    candidateSubjectTimeMap.set(c.id, m)
  })

  const roomAssignmentsMap = new Map<string, Map<string, SeatAssignment[]>>()
  examSites.forEach((site) => {
    site.rooms.forEach((room) => {
      roomAssignmentsMap.set(room.id, new Map())
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
      const subject = subjectMap.get(subjectId)
      if (!subject) continue

      const pairKey = `${candidate.id}-${subjectId}`
      if (assignedPairs.has(pairKey)) continue

      const candidateSubjects = candidateSubjectTimeMap.get(candidate.id)!
      const conflictSubjectsForCandidate = new Set<string>()
      candidateSubjects.forEach((s, sid) => {
        if (sid === subjectId) return
        if (hasTimeConflict(subject, s)) {
          conflictSubjectsForCandidate.add(sid)
        }
      })

      const suitableRooms: { site: ExamSite; room: ExamRoom }[] = []

      for (const site of examSites) {
        for (const room of site.rooms) {
          if (!room.isActive) continue

          if (candidate.specialNeed !== 'none' && constraints.specialAccessibility) {
            if (!room.hasAccessibility) continue
          } else if (candidate.specialNeed === 'none') {
            if (room.layout === 'special') {
              const specialRoomFill = roomAssignmentsMap.get(room.id)?.size || 0
              if (specialRoomFill < 5) continue
            }
          }

          const roomSubjectMap = roomAssignmentsMap.get(room.id)!

          if (constraints.avoidTimeConflict) {
            let conflict = false
            for (const existingSubjectId of roomSubjectMap.keys()) {
              const existingSubject = subjectMap.get(existingSubjectId)
              if (existingSubject && hasTimeConflict(subject, existingSubject)) {
                conflict = true
                conflictCount++
                break
              }
            }
            if (conflict) continue
          }

          suitableRooms.push({ site, room })
        }
      }

      if (suitableRooms.length === 0) {
        warnings.push(
          `考生 ${candidate.name} (${candidate.idCard.slice(-4)}) - 科目「${subject.name}」：未找到合适考场`
        )
        continue
      }

      suitableRooms.sort((a, b) => {
        const aUsage = Array.from(roomAssignmentsMap.get(a.room.id)!.values())
          .reduce((sum, arr) => sum + arr.length, 0)
        const bUsage = Array.from(roomAssignmentsMap.get(b.room.id)!.values())
          .reduce((sum, arr) => sum + arr.length, 0)
        return aUsage - bUsage
      })

      let assigned = false

      for (const { room } of suitableRooms) {
        const roomSubjectMap = roomAssignmentsMap.get(room.id)!

        if (!roomSubjectMap.has(subjectId)) {
          const arrangement: RoomArrangement = {
            id: uuidv4(),
            examRoomId: room.id,
            subjectId,
            date: subject.date,
            assignments: [],
            invigilators: [],
            approvalStatus: 'pending',
          }
          arrangements.push(arrangement)
          roomSubjectMap.set(subjectId, arrangement.assignments)
        }

        const assignments = roomSubjectMap.get(subjectId)!

        if (assignments.length >= room.capacity) continue

        if (constraints.avoidSameSchool) {
          const sameSchoolCount = assignments.filter((a) => {
            const c = candidates.find((cc) => cc.id === a.candidateId)
            return c && c.school === candidate.school
          }).length
          if (sameSchoolCount >= 2) continue
        }

        const seatPos = findBestSeatPosition(assignments, room, constraints)
        if (!seatPos) continue

        const seatNumber = (seatPos.row - 1) * 5 + seatPos.col

        const assignment: SeatAssignment = {
          id: uuidv4(),
          candidateId: candidate.id,
          examRoomId: room.id,
          seatNumber,
          subjectId,
          row: seatPos.row,
          col: seatPos.col,
          isSpecial: candidate.specialNeed !== 'none',
        }

        assignments.push(assignment)
        assignedPairs.add(pairKey)
        assigned = true
        break
      }

      if (!assigned) {
        warnings.push(
          `考生 ${candidate.name} (${candidate.idCard.slice(-4)}) - 科目「${subject.name}」：座位已满或约束无法满足`
        )
      }
    }
  }

  const unassignedCandidates = candidates.filter(
    (c) => !c.subjects.every((s) => assignedPairs.has(`${c.id}-${s}`))
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
      assignedCount: assignedPairs.size,
      specialAssignedCount,
      conflictCount,
    },
  }
}

function findBestSeatPosition(
  existing: SeatAssignment[],
  room: ExamRoom,
  constraints: ArrangementConstraints
): { row: number; col: number } | null {
  const cols = 5
  const rows = Math.ceil(room.capacity / cols)
  const occupied = new Map<string, SeatAssignment>()
  existing.forEach((e) => occupied.set(`${e.row}-${e.col}`, e))

  const spacing = constraints.minSeatSpacing

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const key = `${r}-${c}`
      if (occupied.has(key)) continue

      if (spacing > 0) {
        let valid = true
        for (let dr = -spacing; dr <= spacing; dr++) {
          for (let dc = -spacing; dc <= spacing; dc++) {
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

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const key = `${r}-${c}`
      if (!occupied.has(key)) {
        return { row: r, col: c }
      }
    }
  }

  return null
}
