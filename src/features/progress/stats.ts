import type { Attempt } from '../../db/db'
import { weekdayName, formatYear } from '../../lib/format'
import { centuryOf, type Weekday } from '../../engine'

export interface Summary {
  total: number
  correct: number
  accuracy: number
  medianMs: number | null
}

/** Median of a pre-sorted, non-empty list (averages the two middle values for even length). */
function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function summarize(attempts: Attempt[]): Summary {
  const total = attempts.length
  const correct = attempts.filter((a) => a.correct).length
  const accuracy = total ? correct / total : 0
  const times = attempts
    .map((a) => a.durationMs)
    .filter((t) => t > 0)
    .sort((a, b) => a - b)
  const medianMs = times.length ? median(times) : null
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

/** Human label for a century block keyed by its astronomical start year. */
function centuryLabel(century: number): string {
  // AD blocks read "1900s"; BC / year-0 blocks read via the era formatter ("101 BC").
  return century > 0 ? `${century}s` : formatYear(century)
}

function dimKeyLabel(a: Attempt, dim: Dimension): { key: string; label: string } {
  if (dim === 'weekday') {
    const w = a.correctWeekday as Weekday
    return { key: String(w), label: weekdayName(w) }
  }
  // targetDate is `${year}-MM-DD` with 2-digit MM/DD, so the year is everything
  // before the trailing "-MM-DD". slice(0,-6) (not slice(0,4)) is robust to the
  // wide range now reaching Practice: negative (BC) and 1-3 digit years parse right.
  const year = Number(a.targetDate.slice(0, -6))
  if (!Number.isFinite(year) || a.targetDate === '') return { key: 'unknown', label: 'Unknown' }
  const century = centuryOf(year)
  return { key: String(century), label: centuryLabel(century) }
}

export function accuracyByDimension(attempts: Attempt[], dim: Dimension): Bucket[] {
  const map = new Map<string, Bucket>()
  for (const a of attempts) {
    // Skip learn:* rows — they are lesson reps, not practice (and gradeNumber stashes
    // a day-of-month in correctWeekday, which must not be bucketed as a weekday).
    if (a.mode.startsWith('learn:')) continue
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
  const sortKey = (k: string) => (Number.isFinite(Number(k)) ? Number(k) : Infinity)
  buckets.sort((x, y) => sortKey(x.key) - sortKey(y.key))
  return buckets
}

export function weakest(buckets: Bucket[], minCount = 3): Bucket | null {
  const eligible = buckets.filter((b) => b.total >= minCount)
  if (!eligible.length) return null
  return eligible.reduce((lo, b) =>
    b.accuracy < lo.accuracy || (b.accuracy === lo.accuracy && b.correct < lo.correct) ? b : lo,
  )
}

export interface StepStat {
  step: 'anchor' | 'year' | 'offset'
  label: string
  wrong: number
  total: number
}

export function stepStats(attempts: Attempt[]): StepStat[] {
  const defs: [keyof Attempt, StepStat['step'], string][] = [
    ['anchorCorrect', 'anchor', 'Century anchor'],
    ['yearDoomCorrect', 'year', 'Year doomsday'],
    ['offsetCorrect', 'offset', 'Final offset'],
  ]
  return defs.map(([field, step, label]) => {
    const graded = attempts.filter((a) => a[field] === 0 || a[field] === 1)
    return { step, label, wrong: graded.filter((a) => a[field] === 0).length, total: graded.length }
  })
}
