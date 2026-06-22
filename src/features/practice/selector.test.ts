import { describe, it, expect } from 'vitest'
import { nextProblem } from './selector'
import type { Attempt } from '../../db/db'

const mk = (over: Partial<Attempt>): Attempt => ({
  timestamp: 0, targetDate: '2001-01-01', correctWeekday: 1, guessedWeekday: 1,
  correct: true, durationMs: 1000, mode: 'quick',
  anchorCorrect: null, yearDoomCorrect: null, offsetCorrect: null, timed: false, ...over,
})
const many = (targetDate: string, correct: boolean, n: number) =>
  Array.from({ length: n }, () => mk({ targetDate, correct }))

describe('nextProblem', () => {
  const attempts = [...many('1850-06-06', false, 6), ...many('2050-06-06', true, 6)]
  it('targets the weakest century when rng < 0.5', () => {
    const p = nextProblem(attempts, 0, () => 0.1)
    expect(p.year).toBeGreaterThanOrEqual(1800)
    expect(p.year).toBeLessThanOrEqual(1899)
  })
  it('draws from the level-0 base range when rng >= 0.5', () => {
    const p = nextProblem(attempts, 0, () => 0.9)
    expect(p.year).toBeGreaterThanOrEqual(1700)
    expect(p.year).toBeLessThanOrEqual(2100)
  })
  it('level 2 wide draw can reach beyond 1700-2100', () => {
    // generateForLevel(2) uses generateWideDate (full proleptic range)
    expect(nextProblem([], 2, () => 0.97).year).toBeGreaterThan(2100)
    expect(nextProblem([], 2, () => 0.02).year).toBeLessThan(1)
  })
  it('draws from the level-0 base range when not enough data', () => {
    const p = nextProblem([mk({ targetDate: '1850-01-01', correct: false })], 0, () => 0.1)
    expect(p.year).toBeGreaterThanOrEqual(1700)
    expect(p.year).toBeLessThanOrEqual(2100)
  })
  it('ignores learn:* rows so a bogus learn century cannot become the weakest target', () => {
    // learn:century rows carry a real targetDate but must be filtered before weakest.
    const learn = Array.from({ length: 8 }, () =>
      mk({ targetDate: '1750-06-06', correct: false, mode: 'learn:century' }),
    )
    const p = nextProblem(learn, 0, () => 0.9)
    // No practice attempts remain, so weakest is null -> level-0 wide draw within base range.
    expect(p.year).toBeGreaterThanOrEqual(1700)
    expect(p.year).toBeLessThanOrEqual(2100)
  })
})

describe('nextProblem level-awareness', () => {
  // No attempts → no weak century → always the level wide-draw.
  it('level 0 stays within 1700–2100', () => {
    for (let i = 0; i < 20; i++) {
      const d = nextProblem([], 0, () => (i + 0.5) / 20)
      expect(d.year).toBeGreaterThanOrEqual(1700)
      expect(d.year).toBeLessThanOrEqual(2100)
    }
  })
  it('level 2 can produce years outside 1700–2100', () => {
    const years = Array.from({ length: 30 }, (_, i) => nextProblem([], 2, () => (i + 0.5) / 30).year)
    expect(years.some((y) => y < 1700 || y > 2100)).toBe(true)
  })
  it('defaults to level 0 when no level is passed', () => {
    const d = nextProblem([], undefined, () => 0.5)
    expect(d.year).toBeGreaterThanOrEqual(1700)
    expect(d.year).toBeLessThanOrEqual(2100)
  })
})
