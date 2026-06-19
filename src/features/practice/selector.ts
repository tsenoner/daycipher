import { generateDate, generateWideDate } from '../../engine'
import type { Attempt } from '../../db/db'
import { practiceAttempts } from '../../db/attempts'
import { accuracyByDimension, weakest } from '../progress/stats'

// Weakness-targeting buckets stay on the taught, recall-able centuries — those are
// the ones a learner can be meaningfully "weak" at and re-drill.
const CENTURY: Record<string, { minYear: number; maxYear: number }> = {
  '1700': { minYear: 1700, maxYear: 1799 },
  '1800': { minYear: 1800, maxYear: 1899 },
  '1900': { minYear: 1900, maxYear: 1999 },
  '2000': { minYear: 2000, maxYear: 2099 },
}

/** Whether a century bucket (keyed by its start year, e.g. "1900") is one Practice can
 *  actually re-drill — so the Progress screen never promises "drill it" for a century
 *  the selector can't target. */
export const isDrillableCentury = (key: string): boolean => key in CENTURY

/** ~50% of the time, target the weakest *drillable* century (needs >=5 attempts there);
 *  otherwise draw from the full proleptic range (centered + long tail). Weakness is
 *  ranked only over drillable centuries so a weak BC/far-future bucket can't crowd out
 *  re-drilling a taught one. */
export function nextProblem(attempts: Attempt[], rng: () => number = Math.random) {
  const practice = practiceAttempts(attempts)
  const centuries = accuracyByDimension(practice, 'century').filter((b) => isDrillableCentury(b.key))
  const weak = weakest(centuries, 5)
  if (weak && rng() < 0.5) return generateDate(CENTURY[weak.key], rng)
  return generateWideDate(rng)
}
