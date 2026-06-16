import { describe, it, expect } from 'vitest'
import { generateDate, makeRng } from './generate'
import { isLeapYear } from './doomsday'

describe('generateDate', () => {
  it('always returns a valid date within the year range', () => {
    const rng = makeRng(42)
    for (let i = 0; i < 1000; i++) {
      const { year, month, day } = generateDate({ minYear: 1600, maxYear: 2099 }, rng)
      expect(year).toBeGreaterThanOrEqual(1600)
      expect(year).toBeLessThanOrEqual(2099)
      expect(month).toBeGreaterThanOrEqual(1)
      expect(month).toBeLessThanOrEqual(12)
      const dim = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
        month - 1
      ]
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(dim)
    }
  })
  it('is deterministic for the same seed (Daily Challenge)', () => {
    const a = Array.from({ length: 5 }, () =>
      generateDate({ minYear: 1600, maxYear: 2099 }, makeRng(2026167)),
    )
    const b = Array.from({ length: 5 }, () =>
      generateDate({ minYear: 1600, maxYear: 2099 }, makeRng(2026167)),
    )
    expect(a).toEqual(b)
  })
  it('respects a month constraint', () => {
    const rng = makeRng(7)
    for (let i = 0; i < 200; i++) {
      expect(generateDate({ minYear: 1900, maxYear: 1999, month: 2 }, rng).month).toBe(2)
    }
  })
  it('throws on an out-of-range month constraint', () => {
    expect(() => generateDate({ minYear: 2000, maxYear: 2000, month: 13 }, makeRng(1))).toThrow(
      RangeError,
    )
    expect(() => generateDate({ minYear: 2000, maxYear: 2000, month: 0 }, makeRng(1))).toThrow(
      RangeError,
    )
  })
})
