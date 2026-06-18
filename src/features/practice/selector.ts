import { generateDate } from '../../engine'
import type { Attempt } from '../../db/db'
import { practiceAttempts } from '../../db/attempts'
import { accuracyByDimension, weakest } from '../progress/stats'

const FULL = { minYear: 1900, maxYear: 2099 }
const CENTURY: Record<string, { minYear: number; maxYear: number }> = {
  '1700': { minYear: 1700, maxYear: 1799 },
  '1800': { minYear: 1800, maxYear: 1899 },
  '1900': { minYear: 1900, maxYear: 1999 },
  '2000': { minYear: 2000, maxYear: 2099 },
}

/** ~50% of the time, target the weakest century (needs >=5 attempts there); else full range. */
export function nextProblem(attempts: Attempt[], rng: () => number = Math.random) {
  const practice = practiceAttempts(attempts)
  const weak = weakest(accuracyByDimension(practice, 'century'), 5)
  if (weak && CENTURY[weak.key] && rng() < 0.5) return generateDate(CENTURY[weak.key], rng)
  return generateDate(FULL, rng)
}
