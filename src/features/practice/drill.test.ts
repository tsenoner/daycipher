import { describe, it, expect } from 'vitest'
import { gradeProblem, gradeGuided } from './drill'

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

describe('gradeGuided', () => {
  const p = { year: 1986, month: 3, day: 14 } // century Wed(3), year doom Fri(5), result Fri(5)
  it('all steps correct', () => {
    const a = gradeGuided(p, { century: 3, yearDoom: 5, final: 5 }, 5000, 1)
    expect(a).toMatchObject({
      mode: 'guided', correct: true, anchorCorrect: 1, yearDoomCorrect: 1, offsetCorrect: 1, correctWeekday: 5,
    })
  })
  it('wrong year doomsday but correct stepping', () => {
    const a = gradeGuided(p, { century: 3, yearDoom: 4, final: 4 }, 5000, 1)
    expect(a.correct).toBe(false)
    expect(a.anchorCorrect).toBe(1)
    expect(a.yearDoomCorrect).toBe(0)
    expect(a.offsetCorrect).toBe(1)
  })
})
