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
  SeatAssignment,
  SpecialNeedType,
} from '@/types'

const regions = ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '昌平区']
const schools = ['第一职业学校', '第二职业学校', '技工学院', '财经学校', '工程学校', '卫生学校', '艺术学校', '体育学校']
const subjects = ['法律基础', '财务管理', '人力资源', '工程管理', '计算机应用', '英语四级', '医药卫生', '建筑工程']
const surnames = ['张', '王', '李', '赵', '刘', '陈', '杨', '黄', '周', '吴', '徐', '孙', '朱', '马', '胡']
const names = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '洋', '艳', '勇', '军', '杰', '娟', '涛']
const specialNeeds: SpecialNeedType[] = ['none', 'none', 'none', 'none', 'disability', 'hearing', 'visual', 'other']

function randomIdCard() {
  let id = '110'
  for (let i = 0; i < 14; i++) {
    id += Math.floor(Math.random() * 10)
  }
  id += ['X', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'][Math.floor(Math.random() * 11)]
  return id
}

function randomPhone() {
  let phone = '138'
  for (let i = 0; i < 8; i++) {
    phone += Math.floor(Math.random() * 10)
  }
  return phone
}

function randomName() {
  return surnames[Math.floor(Math.random() * surnames.length)] +
    names[Math.floor(Math.random() * names.length)] +
    (Math.random() > 0.5 ? names[Math.floor(Math.random() * names.length)] : '')
}

export function generateMockData() {
  const examSubjects: ExamSubject[] = subjects.map((name, idx) => ({
    id: uuidv4(),
    name,
    code: `SUB${String(idx + 1).padStart(3, '0')}`,
    date: '2026-06-15',
    startTime: idx % 2 === 0 ? '09:00' : '14:00',
    endTime: idx % 2 === 0 ? '11:30' : '16:30',
    duration: 150,
  }))

  const examSites: ExamSite[] = regions.slice(0, 6).map((region, idx) => {
    const siteId = uuidv4()
    const baseLat = 39.9 + (idx - 3) * 0.08
    const baseLng = 116.3 + (idx - 3) * 0.1
    const rooms = Array.from({ length: 8 }, (_, rIdx) => ({
      id: uuidv4(),
      siteId,
      name: `${idx + 1}号楼${rIdx + 1}考场`,
      floor: `${Math.floor(rIdx / 4) + 1}层`,
      capacity: 30,
      seatSpacing: 1.2,
      hasAccessibility: rIdx === 0 || rIdx === 4,
      isActive: true,
      layout: (rIdx === 0 || rIdx === 4) ? ('special' as const) : ('normal' as const),
      assignedCandidates: [] as string[],
    }))
    return {
      id: siteId,
      name: `${region}考点`,
      address: `${region}XX街道${idx + 1}号`,
      region,
      lat: baseLat,
      lng: baseLng,
      contact: randomName(),
      phone: randomPhone(),
      totalRooms: 8,
      rooms,
    }
  })

  const candidates: Candidate[] = Array.from({ length: 200 }, (_, idx) => {
    const subjectCount = Math.random() > 0.5 ? 1 : 2
    const selectedSubjects: string[] = []
    while (selectedSubjects.length < subjectCount) {
      const s = examSubjects[Math.floor(Math.random() * examSubjects.length)].id
      if (!selectedSubjects.includes(s)) selectedSubjects.push(s)
    }
    const specialNeed = specialNeeds[Math.floor(Math.random() * specialNeeds.length)]
    const statuses: Candidate['status'][] = ['registered', 'registered', 'registered', 'assigned', 'absent']
    return {
      id: uuidv4(),
      name: randomName(),
      idCard: randomIdCard(),
      photo: '',
      subjects: selectedSubjects,
      origin: regions[Math.floor(Math.random() * regions.length)],
      school: schools[Math.floor(Math.random() * schools.length)],
      specialNeed,
      specialNeedDetail: specialNeed !== 'none' ? ['轮椅通行', '听力辅助', '大字试卷', '其他'][Math.floor(Math.random() * 4)] : undefined,
      createdAt: '2026-05-01T10:00:00.000Z',
      status: statuses[Math.floor(Math.random() * statuses.length)],
    }
  })

  const invigilators: Invigilator[] = Array.from({ length: 60 }, (_, idx) => ({
    id: uuidv4(),
    name: randomName(),
    idCard: randomIdCard(),
    phone: randomPhone(),
    qualifiedSubjects: [
      examSubjects[Math.floor(Math.random() * examSubjects.length)].id,
      examSubjects[Math.floor(Math.random() * examSubjects.length)].id,
    ].filter((v, i, a) => a.indexOf(v) === i),
    region: regions[Math.floor(Math.random() * 6)],
    workHours: Math.floor(Math.random() * 40),
    maxWorkHours: 48,
    pastInvigilationCount: Math.floor(Math.random() * 20),
    fairRotationScore: Math.random(),
    status: 'available',
    violationRecords: Math.random() > 0.9 ? 1 : 0,
  }))

  const arrangements: RoomArrangement[] = []
  const schedules: InvigilationSchedule[] = []
  const assignments: SeatAssignment[] = []

  examSites.forEach((site) => {
    site.rooms.slice(0, 4).forEach((room) => {
      const subject = examSubjects[Math.floor(Math.random() * examSubjects.length)]
      const roomAssignments: SeatAssignment[] = Array.from({ length: 25 }, (_, aIdx) => {
        const candidate = candidates[Math.floor(Math.random() * candidates.length)]
        return {
          id: uuidv4(),
          candidateId: candidate.id,
          examRoomId: room.id,
          seatNumber: aIdx + 1,
          subjectId: subject.id,
          row: Math.floor(aIdx / 5) + 1,
          col: (aIdx % 5) + 1,
          isSpecial: candidate.specialNeed !== 'none',
        }
      })
      assignments.push(...roomAssignments)

      const arrId = uuidv4()
      arrangements.push({
        id: arrId,
        examRoomId: room.id,
        subjectId: subject.id,
        date: '2026-06-15',
        assignments: roomAssignments,
        invigilators: [invigilators[0].id, invigilators[1].id],
        approvalStatus: (['pending', 'approved', 'approved', 'rejected'] as const)[Math.floor(Math.random() * 4)],
      })

      schedules.push({
        id: uuidv4(),
        invigilatorId: invigilators[Math.floor(Math.random() * invigilators.length)].id,
        examRoomId: room.id,
        subjectId: subject.id,
        date: '2026-06-15',
        shift: subject.startTime === '09:00' ? 'morning' : 'afternoon',
        role: 'lead',
        status: 'scheduled',
      })
      schedules.push({
        id: uuidv4(),
        invigilatorId: invigilators[Math.floor(Math.random() * invigilators.length)].id,
        examRoomId: room.id,
        subjectId: subject.id,
        date: '2026-06-15',
        shift: subject.startTime === '09:00' ? 'morning' : 'afternoon',
        role: 'assistant',
        status: 'scheduled',
      })
    })
  })

  const approvals: ApprovalRequest[] = arrangements.slice(0, 5).map((a) => ({
    id: uuidv4(),
    type: 'arrangement',
    targetId: a.id,
    title: `考场编排审批 - ${a.id.slice(0, 8)}`,
    description: `考场编排方案待审批`,
    proposer: '考务管理员',
    proposerRole: 'admin',
    status: a.approvalStatus === 'pending' ? 'pending' : (a.approvalStatus === 'approved' ? 'approved' : 'rejected'),
    createdAt: '2026-06-01T09:00:00.000Z',
    processedAt: a.approvalStatus !== 'pending' ? '2026-06-02T10:00:00.000Z' : undefined,
    processedBy: a.approvalStatus !== 'pending' ? '考试主管' : undefined,
    comment: a.approvalStatus === 'rejected' ? '需调整座位布局' : (a.approvalStatus === 'approved' ? '同意' : undefined),
  }))

  const examTasks: ExamTask[] = examSites.slice(0, 4).map((site, idx) => {
    const statuses: ExamTask['status'][] = ['transporting', 'arrived', 'ongoing', 'collected']
    const status = statuses[idx % statuses.length]
    const gpsTrack = status === 'transporting' || status === 'arrived'
      ? Array.from({ length: 10 }, (_, gIdx) => ({
          timestamp: `2026-06-15T0${6 + gIdx}:00:00.000Z`,
          lat: site.lat + (Math.random() - 0.5) * 0.02,
          lng: site.lng + (Math.random() - 0.5) * 0.02,
          speed: 30 + Math.random() * 30,
          isAbnormal: gIdx === 5 && idx === 0,
          abnormalType: (gIdx === 5 && idx === 0 ? 'deviation' : undefined) as 'deviation' | 'stop' | 'speed' | undefined,
        }))
      : undefined
    return {
      id: uuidv4(),
      type: 'paper_transport',
      title: `${site.name} - 试卷押运`,
      subjectId: examSubjects[0].id,
      siteId: site.id,
      vehicleId: `京A${String(10000 + idx).padStart(5, '0')}`,
      status,
      gpsTrack,
      startedAt: '2026-06-15T06:00:00.000Z',
      completedAt: status === 'collected' ? '2026-06-15T18:00:00.000Z' : undefined,
      currentHandler: `押运员${idx + 1}`,
    }
  })

  const scores: Score[] = candidates.slice(0, 100).map((candidate) => {
    const subjectId = candidate.subjects[0]
    const score = Math.floor(Math.random() * 41) + 50
    const secondScore = score + (Math.random() > 0.8 ? Math.floor(Math.random() * 11) - 5 : Math.floor(Math.random() * 3) - 1)
    const diff = Math.abs(score - secondScore)
    const isAbnormal = diff > 3 || score < 30 || score > 95
    return {
      id: uuidv4(),
      candidateId: candidate.id,
      subjectId,
      score,
      enteredBy: '阅卷老师A',
      verifiedBy: isAbnormal ? undefined : '阅卷组长',
      verifiedAt: isAbnormal ? undefined : '2026-06-18T14:00:00.000Z',
      status: isAbnormal ? 'abnormal' : (diff > 2 ? 'draft' : 'verified'),
      isAbnormal,
      abnormalReason: isAbnormal ? (diff > 3 ? '分数差异过大需复核' : (score < 30 ? '异常低分' : '异常高分')) : undefined,
      crossValidation: {
        secondScore,
        secondEnteredBy: '阅卷老师B',
        difference: diff,
        passed: diff <= 2,
      },
      createdAt: '2026-06-17T10:00:00.000Z',
      updatedAt: '2026-06-17T15:00:00.000Z',
    }
  })

  return {
    candidates,
    examSites,
    examSubjects,
    invigilators,
    schedules,
    arrangements,
    approvals,
    examTasks,
    scores,
  }
}
