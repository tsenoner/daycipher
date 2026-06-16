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

const daysInMonth = (year: number, month: number): number => {
  if (month < 1 || month > 12) throw new RangeError(`invalid month: ${month}`)
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}

const pick = (rng: () => number, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1))

export function generateDate(
  c: GenerateConstraints,
  rng: () => number = Math.random,
): { year: number; month: number; day: number } {
  const year = pick(rng, c.minYear, c.maxYear)
  const month = c.month ?? pick(rng, 1, 12)
  const day = pick(rng, 1, daysInMonth(year, month))
  return { year, month, day }
}
