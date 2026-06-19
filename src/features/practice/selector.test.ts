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
    const p = nextProblem(attempts, () => 0.1)
    expect(p.year).toBeGreaterThanOrEqual(1800)
    expect(p.year).toBeLessThanOrEqual(1899)
  })
  it('draws from the wide proleptic range otherwise', () => {
    const p = nextProblem(attempts, () => 0.9)
    expect(p.year).toBeGreaterThanOrEqual(-9998)
    expect(p.year).toBeLessThanOrEqual(9999)
  })
  it('the wide default can reach beyond the taught 1700-2099 window', () => {
    // warpYear sweeps the whole range; a high draw lands in the far future…
    expect(nextProblem([], () => 0.97).year).toBeGreaterThan(2099)
    // …and a low draw reaches BC (astronomical year < 1).
    expect(nextProblem([], () => 0.02).year).toBeLessThan(1)
  })
  it('draws from the wide range when not enough data', () => {
    const p = nextProblem([mk({ targetDate: '1850-01-01', correct: false })], () => 0.1)
    expect(p.year).toBeGreaterThanOrEqual(-9998)
    expect(p.year).toBeLessThanOrEqual(9999)
  })
  it('ignores learn:* rows so a bogus learn century cannot become the weakest target', () => {
    // learn:century rows carry a real targetDate but must be filtered before weakest.
    const learn = Array.from({ length: 8 }, () =>
      mk({ targetDate: '1750-06-06', correct: false, mode: 'learn:century' }),
    )
    const p = nextProblem(learn, () => 0.1)
    // No practice attempts remain, so weakest is null -> wide draw, never the 1700s bucket.
    expect(p.year < 1700 || p.year > 1799).toBe(true)
  })
})
