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
  it('uses full range otherwise', () => {
    const p = nextProblem(attempts, () => 0.9)
    expect(p.year).toBeGreaterThanOrEqual(1900)
  })
  it('uses full range when not enough data', () => {
    const p = nextProblem([mk({ targetDate: '1850-01-01', correct: false })], () => 0.1)
    expect(p.year).toBeGreaterThanOrEqual(1900)
  })
})
