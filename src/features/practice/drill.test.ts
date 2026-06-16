import { describe, it, expect } from 'vitest'
import { gradeProblem } from './drill'

describe('gradeProblem', () => {
  it('marks a correct guess', () => {
    const a = gradeProblem({ year: 1986, month: 3, day: 14 }, 5, 4200, 'quick', 111)
    expect(a).toMatchObject({
      timestamp: 111,
      targetDate: '1986-03-14',
      correctWeekday: 5,
      guessedWeekday: 5,
      correct: true,
      durationMs: 4200,
      mode: 'quick',
      anchorCorrect: null,
      yearDoomCorrect: null,
      offsetCorrect: null,
      timed: false,
    })
  })
  it('marks a wrong guess', () => {
    const a = gradeProblem({ year: 2000, month: 2, day: 2 }, 4, 3000, 'quick', 1)
    expect(a.correctWeekday).toBe(3)
    expect(a.correct).toBe(false)
  })
})
