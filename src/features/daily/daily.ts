import { generateDate, makeRng, CURRENT_YEAR } from '../../engine'
import type { Problem } from '../practice/drill'

function hashKey(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const FULL_RANGE = { minYear: 1900, maxYear: 2099 }

/**
 * The curriculum stage that opens the full Daily year range. Naming it (rather
 * than hard-coding a prefix count) keeps the gate readable and curriculum-stable:
 * under sequential gating `completed.includes(DAILY_FULL_RANGE_STAGE)` means the
 * unbroken completed prefix reached `century`, and it survives stage renumbering.
 */
const DAILY_FULL_RANGE_STAGE = 'century'

/**
 * Stage-scoped year range for the Daily Challenge (R7/§7): full 1900–2099 once
 * Practice is unlocked, or once the learner has completed the `century` stage;
 * otherwise the current year only, so a beginner can still score.
 */
export function dailyRange(
  completed: string[],
  practiceUnlocked: boolean,
): { minYear: number; maxYear: number } {
  const full = practiceUnlocked || completed.includes(DAILY_FULL_RANGE_STAGE)
  return full ? FULL_RANGE : { minYear: CURRENT_YEAR, maxYear: CURRENT_YEAR }
}

/**
 * Deterministic set of dates for a given local day key: everyone sharing the
 * same local calendar date gets the same set, stable for that whole day. The
 * `range` scopes difficulty to the learner's unlocked stages (defaults to full).
 */
export function dailyDates(
  dayKey: string,
  n = 5,
  range: { minYear: number; maxYear: number } = FULL_RANGE,
): Problem[] {
  const rng = makeRng(hashKey(dayKey))
  return Array.from({ length: n }, () => generateDate(range, rng))
}
