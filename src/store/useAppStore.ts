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

const STORAGE_KEY = 'exam-scheduler-persist-v1'

const PERSIST_KEYS: (keyof PersistedState)[] = [
  'candidates',
  'examSites',
  'examSubjects',
  'invigilators',
  'schedules',
  'arrangements',
  'approvals',
  'examTasks',
  'scores',
  'currentUser',
]

interface PersistedState {
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
}

interface AppState extends PersistedState {
  selectedCandidate: Candidate | null
  selectedArrangement: RoomArrangement | null

  addCandidate: (c: Omit<Candidate, 'id' | 'createdAt' | 'status'>) => void
  updateCandidate: (id: string, data: Partial<Candidate>) => void
  deleteCandidate: (id: string) => void
  setSelectedCandidate: (c: Candidate | null) => void

  addArrangement: (a: RoomArrangement | Omit<RoomArrangement, 'id'>) => void
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
  clearAllData: () => void
  loadFromStorage: () => boolean
  saveToStorage: () => void
}

function loadPersistedState(): Partial<PersistedState> | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    return parsed
  } catch (e) {
    console.error('[persist] 读取 localStorage 失败:', e)
    return null
  }
}

function savePersistedState(state: PersistedState): void {
  try {
    if (typeof window === 'undefined') return
    const toSave: Partial<PersistedState> = {}
    PERSIST_KEYS.forEach((k) => {
      ;(toSave as any)[k] = (state as any)[k]
    })
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch (e) {
    console.error('[persist] 写入 localStorage 失败:', e)
  }
}

const defaultUser: User = {
  id: 'admin-001',
  username: 'admin',
  name: '系统管理员',
  role: 'admin',
  region: '全市',
  phone: '13800000000',
}

function getInitialPersistedState(): PersistedState {
  const persisted = loadPersistedState()
  if (persisted) {
    return {
      currentUser: persisted.currentUser || defaultUser,
      candidates: persisted.candidates || [],
      examSites: persisted.examSites || [],
      examSubjects: persisted.examSubjects || [],
      invigilators: persisted.invigilators || [],
      schedules: persisted.schedules || [],
      arrangements: persisted.arrangements || [],
      approvals: persisted.approvals || [],
      examTasks: persisted.examTasks || [],
      scores: persisted.scores || [],
    }
  }
  const mock = generateMockData()
  const initial: PersistedState = {
    currentUser: defaultUser,
    candidates: mock.candidates,
    examSites: mock.examSites,
    examSubjects: mock.examSubjects,
    invigilators: mock.invigilators,
    schedules: mock.schedules,
    arrangements: mock.arrangements,
    approvals: mock.approvals,
    examTasks: mock.examTasks,
    scores: mock.scores,
  }
  savePersistedState(initial)
  return initial
}

const initialPersisted = getInitialPersistedState()

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: initialPersisted.currentUser,
  candidates: initialPersisted.candidates,
  examSites: initialPersisted.examSites,
  examSubjects: initialPersisted.examSubjects,
  invigilators: initialPersisted.invigilators,
  schedules: initialPersisted.schedules,
  arrangements: initialPersisted.arrangements,
  approvals: initialPersisted.approvals,
  examTasks: initialPersisted.examTasks,
  scores: initialPersisted.scores,
  selectedCandidate: null,
  selectedArrangement: null,

  addCandidate: (c) =>
    set((state) => {
      const newState = {
        candidates: [
          ...state.candidates,
          { ...c, id: uuidv4(), createdAt: new Date().toISOString(), status: 'registered' as const },
        ],
      }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

  updateCandidate: (id, data) =>
    set((state) => {
      const newState = {
        candidates: state.candidates.map((c) => (c.id === id ? { ...c, ...data } : c)),
      }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

  deleteCandidate: (id) =>
    set((state) => {
      const newState = {
        candidates: state.candidates.filter((c) => c.id !== id),
      }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

  setSelectedCandidate: (c) => set({ selectedCandidate: c }),

  addArrangement: (a) =>
    set((state) => {
      const newArr = 'id' in a ? (a as RoomArrangement) : { ...a, id: uuidv4() }
      const newState = { arrangements: [...state.arrangements, newArr] }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

  updateArrangement: (id, data) =>
    set((state) => {
      const newState = {
        arrangements: state.arrangements.map((a) => (a.id === id ? { ...a, ...data } : a)),
      }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

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
      set((state) => {
        const newState = {
          arrangements: state.arrangements.map((a) =>
            a.id === id ? { ...a, approvalStatus: 'pending' as const } : a
          ),
        }
        savePersistedState({ ...state, ...newState })
        return newState
      })
    }
  },

  addApproval: (a) =>
    set((state) => {
      const newState = {
        approvals: [
          ...state.approvals,
          { ...a, id: uuidv4(), createdAt: new Date().toISOString(), status: 'pending' as const },
        ],
      }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

  processApproval: (id, status, comment, processor) => {
    set((state) => {
      const newApprovals = state.approvals.map((a) =>
        a.id === id
          ? { ...a, status, comment, processedBy: processor, processedAt: new Date().toISOString() }
          : a
      )
      const approval = newApprovals.find((a) => a.id === id)
      let newArrangements = state.arrangements
      if (approval && approval.type === 'arrangement') {
        newArrangements = state.arrangements.map((a) =>
          a.id === approval.targetId
            ? {
                ...a,
                approvalStatus: status,
                approvalComment: comment,
                approvedBy: processor,
                approvedAt: new Date().toISOString(),
              }
            : a
        )
      }
      const newState = { approvals: newApprovals, arrangements: newArrangements }
      savePersistedState({ ...state, ...newState })
      return newState
    })
  },

  addExamTask: (t) =>
    set((state) => {
      const newState = { examTasks: [...state.examTasks, { ...t, id: uuidv4() }] }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

  updateExamTask: (id, data) =>
    set((state) => {
      const newState = {
        examTasks: state.examTasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
      }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

  addScore: (s) =>
    set((state) => {
      const newState = {
        scores: [
          ...state.scores,
          { ...s, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
      }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

  updateScore: (id, data) =>
    set((state) => {
      const newState = {
        scores: state.scores.map((s) =>
          s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
        ),
      }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

  verifyScore: (id, verifier) => {
    const score = get().scores.find((s) => s.id === id)
    if (score && score.crossValidation?.passed) {
      set((state) => {
        const newState = {
          scores: state.scores.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'verified' as const,
                  verifiedBy: verifier,
                  verifiedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }
        savePersistedState({ ...state, ...newState })
        return newState
      })
    }
  },

  addSchedule: (s) =>
    set((state) => {
      const newState = { schedules: [...state.schedules, { ...s, id: uuidv4() }] }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

  updateSchedule: (id, data) =>
    set((state) => {
      const newState = {
        schedules: state.schedules.map((s) => (s.id === id ? { ...s, ...data } : s)),
      }
      savePersistedState({ ...state, ...newState })
      return newState
    }),

  getStatisticsByRegionAndSubject: () => {
    const { candidates, scores, examSubjects, examSites } = get()
    const result: StatisticsData[] = []

    examSites.forEach((site) => {
      examSubjects.forEach((subject) => {
        const siteCandidates = candidates.filter(
          (c) => (c.region === site.region || c.origin === site.region) && c.subjects.includes(subject.id)
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
    const { examSites, arrangements, invigilators } = get()
    const points: HeatmapPoint[] = []

    examSites.forEach((site) => {
      const roomUsage = arrangements.filter((a) =>
        site.rooms.some((r) => r.id === a.examRoomId)
      ).length
      const invigilatorCount = invigilators.filter((i) => i.examSiteId === site.id).length

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
    set((state) => {
      const newState = {
        candidates: mock.candidates,
        examSites: mock.examSites,
        examSubjects: mock.examSubjects,
        invigilators: mock.invigilators,
        schedules: mock.schedules,
        arrangements: mock.arrangements,
        approvals: mock.approvals,
        examTasks: mock.examTasks,
        scores: mock.scores,
      }
      savePersistedState({ ...state, ...newState })
      return newState
    })
  },

  clearAllData: () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch (e) {
      console.error('[persist] 清除失败:', e)
    }
    const initial = getInitialPersistedState()
    set({
      currentUser: initial.currentUser,
      candidates: initial.candidates,
      examSites: initial.examSites,
      examSubjects: initial.examSubjects,
      invigilators: initial.invigilators,
      schedules: initial.schedules,
      arrangements: initial.arrangements,
      approvals: initial.approvals,
      examTasks: initial.examTasks,
      scores: initial.scores,
    })
  },

  loadFromStorage: () => {
    const persisted = loadPersistedState()
    if (persisted) {
      set({
        currentUser: persisted.currentUser || defaultUser,
        candidates: persisted.candidates || [],
        examSites: persisted.examSites || [],
        examSubjects: persisted.examSubjects || [],
        invigilators: persisted.invigilators || [],
        schedules: persisted.schedules || [],
        arrangements: persisted.arrangements || [],
        approvals: persisted.approvals || [],
        examTasks: persisted.examTasks || [],
        scores: persisted.scores || [],
      })
      return true
    }
    return false
  },

  saveToStorage: () => {
    savePersistedState(get())
  },
}))
