import { describe, it, expect } from 'vitest'
import { gradeProblem, gradeGuided, gradeNumber, gradeWeekday } from './drill'
import { accuracyByDimension } from '../progress/stats'

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
  const p = { year: 1986, month: 3, day: 14 } // century Wed(3), year doom Fri(5), month anchor 14, result Fri(5)
  it('all steps correct', () => {
    const a = gradeGuided(p, { century: 3, yearDoom: 5, monthAnchorDay: 14, final: 5 }, 5000, 1)
    expect(a).toMatchObject({
      mode: 'guided', correct: true, anchorCorrect: 1, yearDoomCorrect: 1,
      monthAnchorCorrect: 1, offsetCorrect: 1, correctWeekday: 5,
    })
  })
  it('wrong year doomsday but correct stepping', () => {
    const a = gradeGuided(p, { century: 3, yearDoom: 4, monthAnchorDay: 14, final: 4 }, 5000, 1)
    expect(a.correct).toBe(false)
    expect(a.anchorCorrect).toBe(1)
    expect(a.yearDoomCorrect).toBe(0)
    expect(a.monthAnchorCorrect).toBe(1)
    expect(a.offsetCorrect).toBe(1)
  })
  it('grades the month anchor independently, without cascading to the final weekday', () => {
    // Wrong anchor day (7 ≠ 14) but the final weekday is still graded against
    // absolute engine truth, so a wrong anchor doesn't fail the whole solve.
    const a = gradeGuided(p, { century: 3, yearDoom: 5, monthAnchorDay: 7, final: 5 }, 5000, 1)
    expect(a.monthAnchorCorrect).toBe(0)
    expect(a.anchorCorrect).toBe(1)
    expect(a.yearDoomCorrect).toBe(1)
    expect(a.correct).toBe(true)
  })
})

describe('gradeNumber', () => {
  it('marks a correct number guess (stage 1/2) with empty targetDate', () => {
    const a = gradeNumber(4, 4, 'learn:months', 0, 42)
    expect(a).toMatchObject({
      timestamp: 42,
      targetDate: '',
      correctWeekday: 4,
      guessedWeekday: 4,
      correct: true,
      durationMs: 0,
      mode: 'learn:months',
      anchorCorrect: null,
      yearDoomCorrect: null,
      offsetCorrect: null,
      timed: false,
    })
  })
  it('marks a wrong number guess', () => {
    const a = gradeNumber(6, 2, 'learn:mod7', 0, 1)
    expect(a.correct).toBe(false)
  })
  it('a day-of-month row does not throw the weekday-dimension cast', () => {
    const a = gradeNumber(29, 29, 'learn:months', 0, 1)
    expect(() => accuracyByDimension([a], 'weekday')).not.toThrow()
  })
})

describe('gradeWeekday', () => {
  it('grades a raw weekday (stage 4) with empty targetDate', () => {
    const a = gradeWeekday(2, 2, 'learn:century', 0, 7, 'anchor')
    expect(a).toMatchObject({
      timestamp: 7,
      targetDate: '',
      correctWeekday: 2,
      guessedWeekday: 2,
      correct: true,
      mode: 'learn:century',
      anchorCorrect: 1,
      yearDoomCorrect: null,
      offsetCorrect: null,
      timed: false,
    })
  })
  it('records a wrong anchor dimension', () => {
    const a = gradeWeekday(2, 5, 'learn:century', 0, 1, 'anchor')
    expect(a.correct).toBe(false)
    expect(a.anchorCorrect).toBe(0)
  })
  it('maps the yearDoom dimension', () => {
    const a = gradeWeekday(3, 3, 'learn:year', 0, 1, 'yearDoom')
    expect(a.anchorCorrect).toBeNull()
    expect(a.yearDoomCorrect).toBe(1)
  })
  it('leaves both dimensions null when none given', () => {
    const a = gradeWeekday(1, 1, 'learn:century', 0, 1)
    expect(a.anchorCorrect).toBeNull()
    expect(a.yearDoomCorrect).toBeNull()
  })
})
