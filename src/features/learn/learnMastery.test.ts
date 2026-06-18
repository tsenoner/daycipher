import { describe, it, expect } from 'vitest'
import {
  STAGE_RULES,
  perStageOutcome,
  stageProgress,
  isStageDone,
  SPEED_MS,
} from './learnMastery'
import type { Attempt } from '../../db/db'

const mk = (over: Partial<Attempt>): Attempt => ({
  timestamp: 0,
  targetDate: '',
  correctWeekday: 1,
  guessedWeekday: 1,
  correct: true,
  durationMs: 0,
  mode: 'learn:mod7',
  anchorCorrect: null,
  yearDoomCorrect: null,
  offsetCorrect: null,
  timed: false,
  ...over,
})

/** Build a newest-first attempt list for `stageId` from an oldest-first outcome string. */
const rows = (stageId: string, pattern: boolean[]): Attempt[] =>
  pattern
    .map((correct, i) =>
      mk({
        mode: `learn:${stageId}`,
        correct,
        timestamp: i,
        timed: stageId === 'speed',
        durationMs: stageId === 'speed' ? 1000 : 0,
      }),
    )
    .reverse() // listAttempts returns newest-first

describe('perStageOutcome', () => {
  it('stages 1–6: outcome is just attempt.correct', () => {
    expect(perStageOutcome(mk({ mode: 'learn:full', correct: true }), 'full')).toBe(true)
    expect(perStageOutcome(mk({ mode: 'learn:full', correct: false }), 'full')).toBe(false)
  })

  it('stage 7: correct AND timed AND fast enough', () => {
    const fast = mk({ mode: 'learn:speed', correct: true, timed: true, durationMs: SPEED_MS })
    const slow = mk({ mode: 'learn:speed', correct: true, timed: true, durationMs: SPEED_MS + 1 })
    const untimed = mk({ mode: 'learn:speed', correct: true, timed: false, durationMs: 100 })
    const wrong = mk({ mode: 'learn:speed', correct: false, timed: true, durationMs: 100 })
    expect(perStageOutcome(fast, 'speed')).toBe(true)
    expect(perStageOutcome(slow, 'speed')).toBe(false)
    expect(perStageOutcome(untimed, 'speed')).toBe(false)
    expect(perStageOutcome(wrong, 'speed')).toBe(false)
  })
})

describe('stageProgress', () => {
  const rule = STAGE_RULES.full // K=4, M=5

  it('not done before M attempts exist', () => {
    const p = stageProgress([true, true, true], rule)
    expect(p.done).toBe(false)
    expect(p.window).toEqual([true, true, true])
    expect(p.correctInWindow).toBe(3)
    expect(p.remaining).toBe(1) // K - correctInWindow
  })

  it('done at K-of-M', () => {
    const p = stageProgress([false, true, true, true, true], rule)
    expect(p.done).toBe(true)
    expect(p.correctInWindow).toBe(4)
    expect(p.remaining).toBe(0)
  })

  it('window is only the trailing M, oldest→newest', () => {
    const p = stageProgress([true, true, true, true, true, true, true], rule)
    expect(p.window).toEqual([true, true, true, true, true])
    expect(p.done).toBe(true)
  })

  it('a slip slides without reset: [F,F,F,T,T,T,T] is done', () => {
    const p = stageProgress([false, false, false, true, true, true, true], rule)
    expect(p.window).toEqual([false, true, true, true, true])
    expect(p.correctInWindow).toBe(4)
    expect(p.done).toBe(true)
  })

  it('remaining counts true gaps, never a hardcoded "1 more"', () => {
    // window [T,T,F,F] -> 2 correct, K=4 -> 2 to go
    const p = stageProgress([true, true, false, false], rule)
    expect(p.correctInWindow).toBe(2)
    expect(p.remaining).toBe(2)
  })

  it('remaining is floored at 0 once K is reached even mid-window', () => {
    const p = stageProgress([true, true, true, true, false], rule)
    expect(p.correctInWindow).toBe(4)
    expect(p.remaining).toBe(0)
    expect(p.done).toBe(true)
  })
})

describe('STAGE_RULES', () => {
  it('stages 1–2 are K=3/M=4, stages 3–7 are K=4/M=5', () => {
    expect(STAGE_RULES.mod7).toEqual({ K: 3, M: 4 })
    expect(STAGE_RULES.months).toEqual({ K: 3, M: 4 })
    for (const id of ['thisyear', 'century', 'year', 'full', 'speed']) {
      expect(STAGE_RULES[id]).toEqual({ K: 4, M: 5 })
    }
  })
})

describe('isStageDone', () => {
  it('mod7 (K=3/M=4): done at 3 of last 4', () => {
    expect(isStageDone(rows('mod7', [true, true, true]), 'mod7')).toBe(false) // < M
    expect(isStageDone(rows('mod7', [false, true, true, true]), 'mod7')).toBe(true)
  })

  it('only counts rows for the matching stage id', () => {
    const mixed = [
      ...rows('mod7', [true, true, true, true]),
      ...rows('months', [false, false, false, false]),
    ]
    expect(isStageDone(mixed, 'mod7')).toBe(true)
    expect(isStageDone(mixed, 'months')).toBe(false)
  })

  it('full (K=4/M=5): slip slides without resetting', () => {
    expect(isStageDone(rows('full', [false, false, false, true, true, true, true]), 'full')).toBe(
      true,
    )
  })

  it('speed: slow-but-correct rows do not count toward K', () => {
    const slowRows = [true, true, true, true, true].map((correct, i) =>
      mk({ mode: 'learn:speed', correct, timed: true, durationMs: SPEED_MS + 50, timestamp: i }),
    )
    expect(isStageDone(slowRows.reverse(), 'speed')).toBe(false)
  })
})
