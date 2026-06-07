import type { GPSTrackPoint } from '@/types'

export interface GPSCheckOptions {
  maxSpeedKmh: number
  maxStopDurationMinutes: number
  deviationThresholdMeters: number
  expectedPath?: { lat: number; lng: number }[]
}

export interface GPSAlert {
  type: 'speed' | 'stop' | 'deviation'
  timestamp: string
  lat: number
  lng: number
  message: string
  severity: 'warning' | 'critical'
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function checkGPSAnomalies(
  track: GPSTrackPoint[],
  options: GPSCheckOptions
): GPSAlert[] {
  const alerts: GPSAlert[] = []
  if (track.length < 2) return alerts

  for (let i = 0; i < track.length; i++) {
    const point = track[i]

    if (point.speed > options.maxSpeedKmh) {
      alerts.push({
        type: 'speed',
        timestamp: point.timestamp,
        lat: point.lat,
        lng: point.lng,
        message: `超速行驶: ${point.speed.toFixed(1)}km/h (限速${options.maxSpeedKmh}km/h)`,
        severity: point.speed > options.maxSpeedKmh * 1.3 ? 'critical' : 'warning',
      })
    }

    if (i > 0 && options.expectedPath && options.expectedPath.length > 0) {
      const nearestDist = Math.min(
        ...options.expectedPath.map(
          (p) => haversineDistance(point.lat, point.lng, p.lat, p.lng)
        )
      )
      if (nearestDist > options.deviationThresholdMeters) {
        alerts.push({
          type: 'deviation',
          timestamp: point.timestamp,
          lat: point.lat,          lng: point.lng,
          message: `轨迹偏离预定路线: 偏离${nearestDist.toFixed(0)}米`,
          severity: nearestDist > options.deviationThresholdMeters * 2 ? 'critical' : 'warning',
        })
      }
    }

    if (i > 0) {
      const prev = track[i - 1]
      const dist = haversineDistance(prev.lat, prev.lng, point.lat, point.lng)
      const timeDiff =
        (new Date(point.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 60000
      if (dist < 50 && timeDiff > options.maxStopDurationMinutes) {
        alerts.push({
          type: 'stop',
          timestamp: point.timestamp,
          lat: point.lat,
          lng: point.lng,
          message: `异常停留: 已停留${timeDiff.toFixed(0)}分钟`,
          severity: timeDiff > options.maxStopDurationMinutes * 2 ? 'critical' : 'warning',
        })
      }
    }
  }

  return alerts
}

export function crossValidateScores(
  score1: number,
  score2: number,
  maxDiff: number = 3
): { passed: boolean; difference: number; needsReview: boolean } {
  const difference = Math.abs(score1 - score2)
  const passed = difference <= maxDiff
  const needsReview = difference > maxDiff || score1 < 30 || score1 > 95 || score2 < 30 || score2 > 95
  return { passed, difference, needsReview }
}

export function detectScoreAbnormalities(
  scores: { candidateId: string; subjectId: string; score: number }[],
  subjectScores: number[]
): { candidateId: string; subjectId: string; reason: string }[] {
  const abnormalities: { candidateId: string; subjectId: string; reason: string }[] = []
  if (subjectScores.length === 0) return abnormalities

  const mean = subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length
  const variance =
    subjectScores.reduce((a, b) => a + (b - mean) ** 2, 0) / subjectScores.length
  const std = Math.sqrt(variance)

  scores.forEach((s) => {
    if (s.score < 0 || s.score > 100) {
      abnormalities.push({ ...s, reason: '分数超出有效范围(0-100)' })
    } else if (s.score < 30) {
      abnormalities.push({ ...s, reason: `极端低分 (${s.score}分 < 30分)` })
    } else if (s.score > 95) {
      abnormalities.push({ ...s, reason: `极端高分 (${s.score}分 > 95分)` })
    } else if (std > 0 && Math.abs(s.score - mean) > 3 * std) {
      abnormalities.push({
        ...s,
        reason: `偏离均值±3σ标准差 (${s.score} vs 均值${mean.toFixed(1)}±${std.toFixed(1)})`,
      })
    } else if (s.score === 0 || s.score === 100) {
      abnormalities.push({ ...s, reason: '满分或零分需复核' })
    }
  })

  return abnormalities
}
