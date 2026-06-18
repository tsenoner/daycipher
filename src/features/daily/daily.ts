import { generateDate, makeRng, CURRENT_YEAR } from '../../engine'
import type { Problem } from '../practice/drill'
import { unlockedDailyMaxStageIndex } from '../learn/learnGate'

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
 * Stage-scoped year range for the Daily Challenge (R7/§7): full 1900–2099 once
 * Practice is unlocked, or once the unbroken completed prefix reaches `century`
 * (count >= 4); otherwise the current year only, so a beginner can still score.
 */
export function dailyRange(
  completed: string[],
  practiceUnlocked: boolean,
): { minYear: number; maxYear: number } {
  const full = practiceUnlocked || unlockedDailyMaxStageIndex(completed) >= 4
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
