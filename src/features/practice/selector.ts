import { generateDate, warpYear, pick, daysInMonth } from '../../engine'
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

/** A date over the full proleptic range, centered on relatable years with a long
 *  tail to the BC / far-future extremes (same shape the lessons use). */
function wideDate(rng: () => number) {
  const year = warpYear(rng())
  const month = pick(rng, 1, 12)
  const day = pick(rng, 1, daysInMonth(year, month))
  return { year, month, day }
}

/** ~50% of the time, target the weakest taught century (needs >=5 attempts there);
 *  otherwise draw from the full proleptic range (centered + long tail). */
export function nextProblem(attempts: Attempt[], rng: () => number = Math.random) {
  const practice = practiceAttempts(attempts)
  const weak = weakest(accuracyByDimension(practice, 'century'), 5)
  if (weak && CENTURY[weak.key] && rng() < 0.5) return generateDate(CENTURY[weak.key], rng)
  return wideDate(rng)
}
