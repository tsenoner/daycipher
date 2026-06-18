import { describe, it, expect } from 'vitest'
import { generateDate, makeRng, pick, daysInMonth, warpYear } from './generate'
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

describe('pick', () => {
  it('returns an integer within [min, max] inclusive', () => {
    const rng = makeRng(99)
    for (let i = 0; i < 1000; i++) {
      const v = pick(rng, 3, 6)
      expect(Number.isInteger(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(6)
    }
  })
  it('can reach both endpoints', () => {
    const rng = makeRng(5)
    const seen = new Set<number>()
    for (let i = 0; i < 300; i++) seen.add(pick(rng, 0, 6))
    expect(seen.has(0)).toBe(true)
    expect(seen.has(6)).toBe(true)
  })
})

describe('daysInMonth', () => {
  it('knows leap February (incl. century rules)', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2023, 2)).toBe(28)
    expect(daysInMonth(2000, 2)).toBe(29)
    expect(daysInMonth(1900, 2)).toBe(28)
  })
  it('throws on an invalid month', () => {
    expect(() => daysInMonth(2000, 0)).toThrow(RangeError)
    expect(() => daysInMonth(2000, 13)).toThrow(RangeError)
  })
})

describe('warpYear', () => {
  it('maps the midpoint to the center and stays within bounds', () => {
    expect(warpYear(0.5)).toBe(2050)
    for (let i = 1; i < 1000; i++) {
      const y = warpYear(i / 1000)
      expect(y).toBeGreaterThanOrEqual(-9998)
      expect(y).toBeLessThanOrEqual(9999)
      expect(Number.isInteger(y)).toBe(true)
    }
  })

  it('keeps ~80% of draws in the relatable core yet reaches both extremes', () => {
    const N = 20000
    let inCore = 0
    let min = Infinity
    let max = -Infinity
    for (let i = 1; i < N; i++) {
      const y = warpYear(i / N)
      if (y >= 1500 && y <= 2600) inCore++
      min = Math.min(min, y)
      max = Math.max(max, y)
    }
    const frac = inCore / (N - 1)
    expect(frac).toBeGreaterThan(0.7)
    expect(frac).toBeLessThan(0.9)
    expect(min).toBe(-9998) // deep BC tail (clamped)
    expect(max).toBe(9999) // deep future tail (clamped)
  })
})
