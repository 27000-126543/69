import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  Candidate,
  ExamSite,
  ExamSubject,
  Invigilator,
  InvigilationSchedule,
  RoomArrangement,
  ApprovalRequest,
  ExamTask,
  Score,
  User,
  SeatAssignment,
  StatisticsData,
  HeatmapPoint,
} from '@/types'
import { generateMockData } from '@/data/mockData'

interface AppState {
  currentUser: User
  candidates: Candidate[]
  examSites: ExamSite[]
  examSubjects: ExamSubject[]
  invigilators: Invigilator[]
  schedules: InvigilationSchedule[]
  arrangements: RoomArrangement[]
  approvals: ApprovalRequest[]
  examTasks: ExamTask[]
  scores: Score[]
  selectedCandidate: Candidate | null
  selectedArrangement: RoomArrangement | null

  addCandidate: (c: Omit<Candidate, 'id' | 'createdAt' | 'status'>) => void
  updateCandidate: (id: string, data: Partial<Candidate>) => void
  deleteCandidate: (id: string) => void
  setSelectedCandidate: (c: Candidate | null) => void

  addArrangement: (a: Omit<RoomArrangement, 'id'>) => void
  updateArrangement: (id: string, data: Partial<RoomArrangement>) => void
  setSelectedArrangement: (a: RoomArrangement | null) => void
  submitArrangementForApproval: (id: string) => void

  addApproval: (a: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status'>) => void
  processApproval: (id: string, status: 'approved' | 'rejected', comment: string, processor: string) => void

  addExamTask: (t: Omit<ExamTask, 'id'>) => void
  updateExamTask: (id: string, data: Partial<ExamTask>) => void

  addScore: (s: Omit<Score, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateScore: (id: string, data: Partial<Score>) => void
  verifyScore: (id: string, verifier: string) => void

  addSchedule: (s: Omit<InvigilationSchedule, 'id'>) => void
  updateSchedule: (id: string, data: Partial<InvigilationSchedule>) => void

  getStatisticsByRegionAndSubject: () => StatisticsData[]
  getHeatmapData: () => HeatmapPoint[]

  initMockData: () => void
}

const defaultUser: User = {
  id: 'admin-001',
  username: 'admin',
  name: '系统管理员',
  role: 'admin',
  region: '全市',
  phone: '13800000000',
}

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: defaultUser,
  candidates: [],
  examSites: [],
  examSubjects: [],
  invigilators: [],
  schedules: [],
  arrangements: [],
  approvals: [],
  examTasks: [],
  scores: [],
  selectedCandidate: null,
  selectedArrangement: null,

  addCandidate: (c) =>
    set((state) => ({
      candidates: [
        ...state.candidates,
        { ...c, id: uuidv4(), createdAt: new Date().toISOString(), status: 'registered' },
      ],
    })),

  updateCandidate: (id, data) =>
    set((state) => ({
      candidates: state.candidates.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),

  deleteCandidate: (id) =>
    set((state) => ({
      candidates: state.candidates.filter((c) => c.id !== id),
    })),

  setSelectedCandidate: (c) => set({ selectedCandidate: c }),

  addArrangement: (a) =>
    set((state) => ({
      arrangements: [...state.arrangements, { ...a, id: uuidv4() }],
    })),

  updateArrangement: (id, data) =>
    set((state) => ({
      arrangements: state.arrangements.map((a) => (a.id === id ? { ...a, ...data } : a)),
    })),

  setSelectedArrangement: (a) => set({ selectedArrangement: a }),

  submitArrangementForApproval: (id) => {
    const arrangement = get().arrangements.find((a) => a.id === id)
    if (arrangement) {
      get().addApproval({
        type: 'arrangement',
        targetId: id,
        title: `考场编排审批 - ${arrangement.id.slice(0, 8)}`,
        description: `考场编排方案待审批，包含 ${arrangement.assignments.length} 名考生`,
        proposer: get().currentUser.name,
        proposerRole: get().currentUser.role,
      })
      set((state) => ({
        arrangements: state.arrangements.map((a) =>
          a.id === id ? { ...a, approvalStatus: 'pending' } : a
        ),
      }))
    }
  },

  addApproval: (a) =>
    set((state) => ({
      approvals: [
        ...state.approvals,
        { ...a, id: uuidv4(), createdAt: new Date().toISOString(), status: 'pending' },
      ],
    })),

  processApproval: (id, status, comment, processor) => {
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.id === id
          ? { ...a, status, comment, processedBy: processor, processedAt: new Date().toISOString() }
          : a
      ),
    }))
    const approval = get().approvals.find((a) => a.id === id)
    if (approval && approval.type === 'arrangement') {
      set((state) => ({
        arrangements: state.arrangements.map((a) =>
          a.id === approval.targetId
            ? {
                ...a,
                approvalStatus: status,
                approvalComment: comment,
                approvedBy: processor,
                approvedAt: new Date().toISOString(),
              }
            : a
        ),
      }))
    }
  },

  addExamTask: (t) => set((state) => ({ examTasks: [...state.examTasks, { ...t, id: uuidv4() }] })),

  updateExamTask: (id, data) =>
    set((state) => ({
      examTasks: state.examTasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),

  addScore: (s) =>
    set((state) => ({
      scores: [
        ...state.scores,
        { ...s, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
    })),

  updateScore: (id, data) =>
    set((state) => ({
      scores: state.scores.map((s) =>
        s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
      ),
    })),

  verifyScore: (id, verifier) => {
    const score = get().scores.find((s) => s.id === id)
    if (score && score.crossValidation?.passed) {
      set((state) => ({
        scores: state.scores.map((s) =>
          s.id === id
            ? { ...s, status: 'verified', verifiedBy: verifier, verifiedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
            : s
        ),
      }))
    }
  },

  addSchedule: (s) => set((state) => ({ schedules: [...state.schedules, { ...s, id: uuidv4() }] })),

  updateSchedule: (id, data) =>
    set((state) => ({
      schedules: state.schedules.map((s) => (s.id === id ? { ...s, ...data } : s)),
    })),

  getStatisticsByRegionAndSubject: () => {
    const { candidates, scores, examSubjects, examSites } = get()
    const result: StatisticsData[] = []

    examSites.forEach((site) => {
      examSubjects.forEach((subject) => {
        const siteCandidates = candidates.filter(
          (c) => c.origin === site.region && c.subjects.includes(subject.id)
        )
        const subjectScores = scores.filter(
          (s) => s.subjectId === subject.id && siteCandidates.some((c) => c.id === s.candidateId)
        )

        const total = siteCandidates.length
        const attended = siteCandidates.filter((c) => c.status !== 'absent').length
        const cheated = siteCandidates.filter((c) => c.status === 'cheated').length
        const validScores = subjectScores.filter((s) => !s.isAbnormal)
        const avgScore = validScores.length > 0
          ? validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length
          : 0

        const distribution = [
          { range: '0-59', count: validScores.filter((s) => s.score < 60).length },
          { range: '60-69', count: validScores.filter((s) => s.score >= 60 && s.score < 70).length },
          { range: '70-79', count: validScores.filter((s) => s.score >= 70 && s.score < 80).length },
          { range: '80-89', count: validScores.filter((s) => s.score >= 80 && s.score < 90).length },
          { range: '90-100', count: validScores.filter((s) => s.score >= 90).length },
        ]

        result.push({
          region: site.region,
          subjectId: subject.id,
          subjectName: subject.name,
          totalCandidates: total,
          attendedCount: attended,
          absentCount: total - attended,
          absentRate: total > 0 ? (total - attended) / total : 0,
          cheatedCount: cheated,
          cheatedRate: total > 0 ? cheated / total : 0,
          averageScore: Math.round(avgScore * 100) / 100,
          maxScore: validScores.length > 0 ? Math.max(...validScores.map((s) => s.score)) : 0,
          minScore: validScores.length > 0 ? Math.min(...validScores.map((s) => s.score)) : 0,
          passRate: validScores.length > 0
            ? validScores.filter((s) => s.score >= 60).length / validScores.length
            : 0,
          scoreDistribution: distribution,
        })
      })
    })

    return result
  },

  getHeatmapData: () => {
    const { examSites, arrangements, invigilators, schedules } = get()
    const points: HeatmapPoint[] = []

    examSites.forEach((site) => {
      const roomUsage = arrangements.filter((a) =>
        site.rooms.some((r) => r.id === a.examRoomId)
      ).length
      const invigilatorCount = schedules.filter((s) =>
        site.rooms.some((r) => r.id === s.examRoomId)
      ).length

      points.push({
        lat: site.lat,
        lng: site.lng,
        value: roomUsage,
        type: 'room_usage',
      })
      points.push({
        lat: site.lat,
        lng: site.lng,
        value: invigilatorCount,
        type: 'invigilator_density',
      })
    })

    return points
  },

  initMockData: () => {
    const mock = generateMockData()
    set({
      candidates: mock.candidates,
      examSites: mock.examSites,
      examSubjects: mock.examSubjects,
      invigilators: mock.invigilators,
      schedules: mock.schedules,
      arrangements: mock.arrangements,
      approvals: mock.approvals,
      examTasks: mock.examTasks,
      scores: mock.scores,
    })
  },
}))
