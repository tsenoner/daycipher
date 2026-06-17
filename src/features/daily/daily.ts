import { generateDate, makeRng } from '../../engine'
import type { Problem } from '../practice/drill'

function hashKey(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const RANGE = { minYear: 1900, maxYear: 2099 }

/** Deterministic set of dates for a given local day key — same for everyone, stable per day. */
export function dailyDates(dayKey: string, n = 5): Problem[] {
  const rng = makeRng(hashKey(dayKey))
  return Array.from({ length: n }, () => generateDate(RANGE, rng))
}
