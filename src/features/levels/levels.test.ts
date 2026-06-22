import { describe, it, expect } from 'vitest'
import {
  LEVELS, MAX_LEVEL, clampLevel, nextTakeableLevel, generateForLevel,
  gradeLevelTest, ao5, tierForAo5,
} from './levels'

describe('levels table', () => {
  it('has 3 levels with the recent base first and full last', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(['recent', 'ad', 'full'])
    expect(MAX_LEVEL).toBe(2)
    expect(LEVELS[0].range).toEqual({ minYear: 1700, maxYear: 2100 })
    expect(LEVELS[2].range).toBeNull()
  })
})

describe('clampLevel', () => {
  it('clamps out-of-range / non-finite into [0, MAX_LEVEL]', () => {
    expect(clampLevel(-3)).toBe(0)
    expect(clampLevel(99)).toBe(2)
    expect(clampLevel(1.9)).toBe(1)
    expect(clampLevel(NaN)).toBe(0)
  })
})

describe('nextTakeableLevel', () => {
  it('returns the next level, or null at the top', () => {
    expect(nextTakeableLevel(0)).toBe(1)
    expect(nextTakeableLevel(1)).toBe(2)
    expect(nextTakeableLevel(2)).toBeNull()
  })
})

describe('generateForLevel', () => {
  const rng = () => 0.5
  it('keeps level 0 inside 1700–2100', () => {
    const d = generateForLevel(0, rng)
    expect(d.year).toBeGreaterThanOrEqual(1700)
    expect(d.year).toBeLessThanOrEqual(2100)
  })
  it('level 1 can exceed 2100 (1–9999 AD)', () => {
    const d = generateForLevel(1, () => 0.99)
    expect(d.year).toBeGreaterThan(2100)
  })
  it('level 2 (full) can reach BC years', () => {
    const d = generateForLevel(2, () => 0.001)
    expect(d.year).toBeLessThan(0)
  })
})

describe('gradeLevelTest', () => {
  it('passes at >= 9 of 10', () => {
    expect(gradeLevelTest(8)).toBe(false)
    expect(gradeLevelTest(9)).toBe(true)
    expect(gradeLevelTest(10)).toBe(true)
  })
})

describe('ao5', () => {
  const ok = (ms: number) => ({ ms, correct: true })
  it('drops fastest+slowest and means the middle 3', () => {
    expect(ao5([ok(1000), ok(2000), ok(3000), ok(4000), ok(5000)])).toBe(3000)
  })
  it('tolerates ONE dnf (it becomes the dropped slowest)', () => {
    expect(ao5([ok(1000), ok(2000), ok(3000), ok(4000), { ms: 9999, correct: false }])).toBe(3000)
  })
  it('is DNF (null) with two or more wrong solves', () => {
    expect(ao5([ok(1000), ok(2000), ok(3000), { ms: 1, correct: false }, { ms: 2, correct: false }])).toBeNull()
  })
  it('returns null when not exactly 5 solves', () => {
    expect(ao5([ok(1000), ok(2000)])).toBeNull()
  })
})

describe('tierForAo5', () => {
  it('maps ms to bronze/silver/gold with exclusive bounds', () => {
    expect(tierForAo5(1999)).toBe(3)
    expect(tierForAo5(2000)).toBe(2)
    expect(tierForAo5(4999)).toBe(2)
    expect(tierForAo5(5000)).toBe(1)
    expect(tierForAo5(9999)).toBe(1)
    expect(tierForAo5(10000)).toBe(0)
    expect(tierForAo5(null)).toBe(0)
  })
})
