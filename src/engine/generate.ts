import { isLeapYear } from './doomsday'

export interface GenerateConstraints {
  minYear: number
  maxYear: number
  month?: number
}

/** mulberry32 — small deterministic PRNG returning [0,1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const daysInMonth = (year: number, month: number): number => {
  if (month < 1 || month > 12) throw new RangeError(`invalid month: ${month}`)
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}

/** Uniform integer in [min, max] inclusive, drawn from `rng` (reused by lesson generators). */
export const pick = (rng: () => number, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1))

/** Uniformly draw one element of a non-empty array, drawn from `rng`. */
export const pickFrom = <T>(rng: () => number, arr: readonly T[]): T =>
  arr[pick(rng, 0, arr.length - 1)]

export function generateDate(
  c: GenerateConstraints,
  rng: () => number = Math.random,
): { year: number; month: number; day: number } {
  const year = pick(rng, c.minYear, c.maxYear)
  const month = c.month ?? pick(rng, 1, 12)
  const day = pick(rng, 1, daysInMonth(year, month))
  return { year, month, day }
}

export interface WarpYearOpts {
  center?: number
  scale?: number
  min?: number
  max?: number
}

/**
 * Map a uniform u∈[0,1) to an integer year via the Cauchy inverse-CDF: dense near
 * `center`, heavy symmetric tails that reach `min`/`max` (then clamp). Monotonic, so it
 * preserves the spread of whatever stream feeds it. Years are astronomical (0 = 1 BC).
 */
export function warpYear(u: number, opts: WarpYearOpts = {}): number {
  const { center = 2050, scale = 180, min = -9998, max = 9999 } = opts
  const clamped = Math.min(Math.max(u, 1e-9), 1 - 1e-9)
  const raw = center + scale * Math.tan(Math.PI * (clamped - 0.5))
  return Math.min(max, Math.max(min, Math.round(raw)))
}

/**
 * A full-range proleptic date: a `warpYear` year (centered on relatable years with a
 * long tail to the BC / far-future extremes) plus a uniform month and a valid day.
 * Shared by Practice and the lessons so their "wide" distribution can't drift apart.
 */
export function generateWideDate(rng: () => number = Math.random): {
  year: number
  month: number
  day: number
} {
  const year = warpYear(rng())
  const month = pick(rng, 1, 12)
  const day = pick(rng, 1, daysInMonth(year, month))
  return { year, month, day }
}
