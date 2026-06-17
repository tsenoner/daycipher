import type { Attempt } from '../../db/db'
import { weekdayName } from '../../lib/format'
import type { Weekday } from '../../engine'

export interface Summary {
  total: number
  correct: number
  accuracy: number
  medianMs: number | null
}

export function summarize(attempts: Attempt[]): Summary {
  const total = attempts.length
  const correct = attempts.filter((a) => a.correct).length
  const accuracy = total ? correct / total : 0
  const times = attempts
    .map((a) => a.durationMs)
    .filter((t) => t > 0)
    .sort((a, b) => a - b)
  const medianMs = times.length ? times[Math.floor(times.length / 2)] : null
  return { total, correct, accuracy, medianMs }
}

export type Dimension = 'century' | 'weekday'

export interface Bucket {
  key: string
  label: string
  total: number
  correct: number
  accuracy: number
}

function dimKeyLabel(a: Attempt, dim: Dimension): { key: string; label: string } {
  if (dim === 'weekday') {
    const w = a.correctWeekday as Weekday
    return { key: String(w), label: weekdayName(w) }
  }
  const year = Number(a.targetDate.slice(0, 4))
  const century = Math.floor(year / 100) * 100
  return { key: String(century), label: `${century}s` }
}

export function accuracyByDimension(attempts: Attempt[], dim: Dimension): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const a of attempts) {
    const { key, label } = dimKeyLabel(a, dim)
    let b = map.get(key)
    if (!b) {
      b = { key, label, total: 0, correct: 0, accuracy: 0 }
      map.set(key, b)
    }
    b.total++
    if (a.correct) b.correct++
  }
  const buckets = [...map.values()]
  for (const b of buckets) b.accuracy = b.total ? b.correct / b.total : 0
  buckets.sort((x, y) => Number(x.key) - Number(y.key))
  return buckets
}

export function weakest(buckets: Bucket[], minCount = 3): Bucket | null {
  const eligible = buckets.filter((b) => b.total >= minCount)
  if (!eligible.length) return null
  return eligible.reduce((lo, b) =>
    b.accuracy < lo.accuracy || (b.accuracy === lo.accuracy && b.correct < lo.correct) ? b : lo,
  )
}
