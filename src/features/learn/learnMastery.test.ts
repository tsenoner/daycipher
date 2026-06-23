import { describe, it, expect } from 'vitest'
import {
  STAGE_RULES,
  perStageOutcome,
  stageOutcomes,
  stageProgress,
  isStageDone,
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
  monthAnchorCorrect: null,
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
      }),
    )
    .reverse() // listAttempts returns newest-first

describe('perStageOutcome', () => {
  it('every stage: outcome is just attempt.correct', () => {
    expect(perStageOutcome(mk({ mode: 'learn:full', correct: true }), 'full')).toBe(true)
    expect(perStageOutcome(mk({ mode: 'learn:full', correct: false }), 'full')).toBe(false)
  })

  it('the final `full` stage is untimed: a correct-but-slow answer still counts', () => {
    const slow = mk({ mode: 'learn:full', correct: true, durationMs: 999_999 })
    expect(perStageOutcome(slow, 'full')).toBe(true)
  })
})

describe('stageOutcomes', () => {
  it('filters to the stage, restores oldest-first, and maps to booleans', () => {
    const mixed = [
      ...rows('mod7', [true, false, true]),
      ...rows('months', [false, false]),
    ]
    // rows() returns newest-first; stageOutcomes must hand back oldest-first.
    expect(stageOutcomes(mixed, 'mod7')).toEqual([true, false, true])
    expect(stageOutcomes(mixed, 'months')).toEqual([false, false])
  })

  it('does not penalize slow answers on the final `full` stage', () => {
    const fullRows = [true, true].map((correct, i) =>
      mk({ mode: 'learn:full', correct, durationMs: 999_999, timestamp: i }),
    )
    // Correct rows count regardless of how long they took — no speed gate.
    expect(stageOutcomes(fullRows.reverse(), 'full')).toEqual([true, true])
  })
})

describe('stageProgress', () => {
  const rule = STAGE_RULES.full // K=4, M=5

  it('not done before M attempts exist', () => {
    const p = stageProgress([true, true, true], rule)
    expect(p.done).toBe(false)
    expect(p.window).toEqual([true, true, true])
    expect(p.correctInWindow).toBe(3)
    // 3 corrects (K=4 gap 1) but only 3 reps (M=5 gap 2) → the larger gap wins.
    expect(p.remaining).toBe(2)
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

  it('remaining never reads 0 while not done: K corrects but fewer than M reps', () => {
    // K=4 corrects reached at only 4 reps; M=5 still needs one more rep.
    const p = stageProgress([true, true, true, true], rule)
    expect(p.correctInWindow).toBe(4)
    expect(p.done).toBe(false)
    expect(p.remaining).toBe(1) // the M-rep gap (5 - 4), not the K gap (0)
  })

  it('remaining is exactly 0 when done', () => {
    const p = stageProgress([true, true, true, true, true], rule)
    expect(p.done).toBe(true)
    expect(p.remaining).toBe(0)
  })
})

describe('STAGE_RULES', () => {
  it('atomic stages are K=5/M=5 (no slip); composites stay K=4/M=5', () => {
    for (const id of ['mod7', 'leap', 'months', 'century', 'year']) {
      expect(STAGE_RULES[id]).toEqual({ K: 5, M: 5 })
    }
    for (const id of ['thisyear', 'full']) {
      expect(STAGE_RULES[id]).toEqual({ K: 4, M: 5 })
    }
  })
})

describe('isStageDone', () => {
  it('mod7 (K=5/M=5): done only on 5 correct in the last 5', () => {
    expect(isStageDone(rows('mod7', [true, true, true, true]), 'mod7')).toBe(false) // < M
    expect(isStageDone(rows('mod7', [false, true, true, true, true]), 'mod7')).toBe(false) // slip in window
    expect(isStageDone(rows('mod7', [true, true, true, true, true]), 'mod7')).toBe(true)
    expect(isStageDone(rows('mod7', [false, true, true, true, true, true]), 'mod7')).toBe(true) // slip slid out
  })

  it('only counts rows for the matching stage id', () => {
    const mixed = [
      ...rows('mod7', [true, true, true, true, true]),
      ...rows('months', [false, false, false, false, false]),
    ]
    expect(isStageDone(mixed, 'mod7')).toBe(true)
    expect(isStageDone(mixed, 'months')).toBe(false)
  })

  it('full (K=4/M=5): slip slides without resetting', () => {
    expect(isStageDone(rows('full', [false, false, false, true, true, true, true]), 'full')).toBe(
      true,
    )
  })

  it('full: slow-but-correct rows still count toward K (no speed gate)', () => {
    const slowRows = [true, true, true, true, true].map((correct, i) =>
      mk({ mode: 'learn:full', correct, durationMs: 999_999, timestamp: i }),
    )
    expect(isStageDone(slowRows.reverse(), 'full')).toBe(true)
  })
})
