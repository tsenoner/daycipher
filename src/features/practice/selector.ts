import { generateDate } from '../../engine'
import type { Attempt } from '../../db/db'
import { practiceAttempts } from '../../db/attempts'
import { accuracyByDimension, weakest } from '../progress/stats'
import { generateForLevel } from '../levels/levels'

// Weakness-targeting buckets stay on the taught, recall-able centuries — those are
// the ones a learner can be meaningfully "weak" at and re-drill.
const CENTURY: Record<string, { minYear: number; maxYear: number }> = {
  '1700': { minYear: 1700, maxYear: 1799 },
  '1800': { minYear: 1800, maxYear: 1899 },
  '1900': { minYear: 1900, maxYear: 1999 },
  '2000': { minYear: 2000, maxYear: 2099 },
}

export const isDrillableCentury = (key: string): boolean => key in CENTURY

/**
 * ~50% of the time, re-drill the weakest *drillable* (taught) century (needs >=5
 * attempts there); otherwise draw from the learner's currently-unlocked Level range
 * (`level`, default 0 = 1700–2100). Weakness-targeting is always within taught
 * centuries regardless of Level.
 */
export function nextProblem(
  attempts: Attempt[],
  level = 0,
  rng: () => number = Math.random,
) {
  const practice = practiceAttempts(attempts)
  const centuries = accuracyByDimension(practice, 'century').filter((b) => isDrillableCentury(b.key))
  const weak = weakest(centuries, 5)
  if (weak && rng() < 0.5) return generateDate(CENTURY[weak.key], rng)
  return generateForLevel(level, rng)
}
