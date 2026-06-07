export type SpecialNeedType = 'none' | 'disability' | 'hearing' | 'visual' | 'other'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'adjusting'

export type ExamTaskStatus = 'pending' | 'transporting' | 'arrived' | 'ongoing' | 'collected' | 'returned'

export type ScoreStatus = 'draft' | 'verified' | 'abnormal' | 'finalized'

export interface Candidate {
  id: string
  name: string
  idCard: string
  photo: string
  subjects: string[]
  origin: string
  region: string
  school: string
  specialNeed: SpecialNeedType
  specialNeedDetail?: string
  createdAt: string
  status: 'registered' | 'assigned' | 'absent' | 'cheated'
  seatNumber?: string
  examRoomId?: string
}

export interface ExamSubject {
  id: string
  name: string
  code: string
  date: string
  startTime: string
  endTime: string
  duration: number
}

export interface ExamSite {
  id: string
  name: string
  address: string
  region: string
  lat: number
  lng: number
  contact: string
  phone: string
  totalRooms: number
  rooms: ExamRoom[]
}

export interface ExamRoom {
  id: string
  siteId: string
  name: string
  floor: string
  capacity: number
  seatSpacing: number
  hasAccessibility: boolean
  isActive: boolean
  layout: 'normal' | 'special'
  assignedCandidates: string[]
}

export interface Invigilator {
  id: string
  name: string
  idCard: string
  phone: string
  qualifiedSubjects: string[]
  region: string
  examSiteId?: string
  workHours: number
  maxWorkHours: number
  pastInvigilationCount: number
  fairRotationScore: number
  status: 'available' | 'assigned' | 'leave'
  violationRecords: number
}

export interface InvigilationSchedule {
  id: string
  invigilatorId: string
  examRoomId: string
  subjectId: string
  date: string
  shift: 'morning' | 'afternoon' | 'evening'
  role: 'lead' | 'assistant'
  status: 'scheduled' | 'adjusting' | 'completed'
}

export interface SeatAssignment {
  id: string
  candidateId: string
  examRoomId: string
  seatNumber: number
  subjectId: string
  row: number
  col: number
  isSpecial: boolean
}

export interface RoomArrangement {
  id: string
  examRoomId: string
  subjectId: string
  date: string
  assignments: SeatAssignment[]
  invigilators: string[]
  approvalStatus: ApprovalStatus
  approvalComment?: string
  approvedBy?: string
  approvedAt?: string
}

export interface ApprovalRequest {
  id: string
  type: 'arrangement' | 'adjustment' | 'schedule' | 'score'
  targetId: string
  title: string
  description: string
  proposer: string
  proposerRole: string
  status: ApprovalStatus
  createdAt: string
  processedAt?: string
  processedBy?: string
  comment?: string
}

export interface ExamTask {
  id: string
  type: 'paper_transport' | 'exam_session' | 'paper_return'
  title: string
  subjectId: string
  examRoomId?: string
  siteId: string
  vehicleId?: string
  status: ExamTaskStatus
  gpsTrack?: GPSTrackPoint[]
  startedAt?: string
  completedAt?: string
  currentHandler: string
  notes?: string
}

export interface GPSTrackPoint {
  timestamp: string
  lat: number
  lng: number
  speed: number
  isAbnormal: boolean
  abnormalType?: 'deviation' | 'stop' | 'speed'
}

export interface Score {
  id: string
  candidateId: string
  subjectId: string
  score: number
  enteredBy: string
  verifiedBy?: string
  verifiedAt?: string
  status: ScoreStatus
  isAbnormal: boolean
  abnormalReason?: string
  crossValidation?: {
    secondScore: number
    secondEnteredBy: string
    difference: number
    passed: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface StatisticsData {
  region: string
  subjectId: string
  subjectName: string
  candidateCount?: number
  totalCandidates?: number
  attendedCount?: number
  absentCount: number
  absentRate: number
  cheatCount?: number
  cheatedCount?: number
  cheatRate?: number
  cheatedRate?: number
  avgScore?: number
  averageScore?: number
  maxScore?: number
  minScore?: number
  passRate?: number
  scoreDistribution?: { range: string; count: number }[]
}

export interface HeatmapPoint {
  lat: number
  lng: number
  value: number
  type: 'room_usage' | 'invigilator_density'
}

export type UserRole = 'admin' | 'exam_authority' | 'site_manager' | 'invigilator' | 'scorer' | 'group_leader'

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  region: string
  siteId?: string
  phone: string
}
