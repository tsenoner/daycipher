import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useLessonDrill,
  nextLessonProblem,
  gradeLesson,
  ANCHOR_DAYS,
  type LessonProblem,
} from './useLessonDrill'
import { makeRng } from '../../engine'
import { listAttempts } from '../../db/attempts'
import { getMeta } from '../../db/meta'
import { resetTestDb } from '../../test/resetDb'
import { stageOutcomes } from './learnMastery'

type DrillResult = {
  current: { current: LessonProblem | null; answer: (v: number, ms?: number) => void }
}

/** Answer the live problem with its known-correct value. */
async function answerCorrect(result: DrillResult, durationMs?: number): Promise<void> {
  const p = result.current.current
  if (!p) throw new Error('no live problem')
  await act(async () => result.current.answer(p.correct, durationMs))
}

/** Answer the live problem with a deliberately wrong value. */
async function answerWrong(result: DrillResult): Promise<void> {
  const p = result.current.current
  if (!p) throw new Error('no live problem')
  // Any value other than the correct one (weekdays/numbers are all >= 0).
  await act(async () => result.current.answer(p.correct === 0 ? 1 : 0))
}

describe('nextLessonProblem', () => {
  it('stage 1 (mod7) draws a number prompt graded by casting out sevens', () => {
    const p = nextLessonProblem('mod7', makeRng(1))
    expect(p.answerKind).toBe('number')
    expect(p.options).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(p.correct).toBe(p.correct % 7) // a weekday number 0..6
    expect(p.prompt).toMatch(/mod 7|sevens/i)
  })

  it('stage 2 (months) answers with a day-of-month from the anchor set', () => {
    const p = nextLessonProblem('months', makeRng(2))
    expect(p.answerKind).toBe('number')
    expect(p.options).toEqual(ANCHOR_DAYS)
    expect(ANCHOR_DAYS).toContain(p.correct)
  })

  it('stage 4 (century) is a weekday prompt with a 0..6 answer', () => {
    const p = nextLessonProblem('century', makeRng(3))
    expect(p.answerKind).toBe('weekday')
    expect(p.correct).toBeGreaterThanOrEqual(0)
    expect(p.correct).toBeLessThanOrEqual(6)
  })

  it('stage 5 (year) asks for the year doomsday weekday', () => {
    const p = nextLessonProblem('year', makeRng(4))
    expect(p.answerKind).toBe('weekday')
    expect(p.correct).toBeGreaterThanOrEqual(0)
    expect(p.correct).toBeLessThanOrEqual(6)
  })

  it('is deterministic for a given seed', () => {
    expect(nextLessonProblem('full', makeRng(99))).toEqual(nextLessonProblem('full', makeRng(99)))
  })

  it('stage leap asks a yes/no leap-year question with a 0/1 answer', () => {
    const p = nextLessonProblem('leap', makeRng(31), { index: 0, runSeed: 1 })
    expect(p.answerKind).toBe('boolean')
    expect([0, 1]).toContain(p.correct)
    expect(p.prompt).toMatch(/leap year\?/i)
  })

  it('accepts an optional ctx without changing weighted-stage output', () => {
    const a = nextLessonProblem('full', makeRng(99))
    const b = nextLessonProblem('full', makeRng(99), { index: 3, runSeed: 7 })
    expect(b).toEqual(a) // weighted stages ignore ctx
  })
})

describe('gradeLesson', () => {
  it('stage 1 writes a learn:mod7 row with empty targetDate and the drawn number', () => {
    const p = nextLessonProblem('mod7', makeRng(1))
    const a = gradeLesson(p, p.correct, 0, 10)
    expect(a.mode).toBe('learn:mod7')
    expect(a.targetDate).toBe('')
    expect(a.correct).toBe(true)
    expect(a.timed).toBe(false)
  })

  it('the final `full` stage writes an untimed dated row carrying durationMs', () => {
    const p = nextLessonProblem('full', makeRng(5))
    const a = gradeLesson(p, p.correct, 1234, 10)
    expect(a.mode).toBe('learn:full')
    expect(a.timed).toBe(false)
    expect(a.durationMs).toBe(1234)
    expect(a.correct).toBe(true)
  })

  it('a wrong stage-2 answer is recorded as incorrect', () => {
    const p = nextLessonProblem('months', makeRng(2))
    const a = gradeLesson(p, p.correct === 0 ? 1 : 0, 0, 10)
    expect(a.correct).toBe(false)
  })

  it('a leap answer writes a learn:leap row carrying the 0/1 guess', () => {
    const p = nextLessonProblem('leap', makeRng(31))
    const a = gradeLesson(p, p.correct, 0, 10)
    expect(a.mode).toBe('learn:leap')
    expect(a.targetDate).toBe('')
    expect(a.correct).toBe(true)
  })
})

describe('useLessonDrill', () => {
  // Await the delete so a late write from a prior test's in-flight effect can't
  // leak into this test's fresh database.
  beforeEach(resetTestDb)

  it('K-of-M correct answers internalize the stage (mod7: 5 of 5)', async () => {
    const { result } = renderHook(() => useLessonDrill('mod7', { rng: makeRng(7) }))
    await waitFor(() => expect(result.current.current).not.toBeNull())

    expect(result.current.done).toBe(false)
    for (let i = 0; i < 5; i++) await answerCorrect(result)

    await waitFor(() => expect(result.current.done).toBe(true))
    await waitFor(async () =>
      expect(await getMeta<string[]>('learnCompleted', [])).toContain('mod7'),
    )
  })

  it('first CORRECT rep credits the streak but does not yet complete the stage', async () => {
    const { result } = renderHook(() => useLessonDrill('mod7', { rng: makeRng(8) }))
    await waitFor(() => expect(result.current.current).not.toBeNull())

    await answerCorrect(result)
    await waitFor(async () => expect(await getMeta<number>('currentStreak', 0)).toBe(1))
    expect(result.current.done).toBe(false)
    expect(await getMeta<string[]>('learnCompleted', [])).not.toContain('mod7')
  })

  it('first WRONG rep records a row but does NOT credit the streak', async () => {
    const { result } = renderHook(() => useLessonDrill('mod7', { rng: makeRng(9) }))
    await waitFor(() => expect(result.current.current).not.toBeNull())

    await answerWrong(result)
    await waitFor(async () => expect((await listAttempts()).length).toBe(1))
    expect(await getMeta<number>('currentStreak', 0)).toBe(0)
  })

  it('a slip slides out of the window without wiping progress', async () => {
    const { result } = renderHook(() => useLessonDrill('mod7', { rng: makeRng(11) }))
    await waitFor(() => expect(result.current.current).not.toBeNull())

    // mod7 rule is K=5,M=5. Sequence [F,T,T,T,T,T] (oldest->newest) must complete:
    // the slip slides out, so the last 5 = [T,T,T,T,T] = 5 correct.
    await answerWrong(result)
    for (let i = 0; i < 5; i++) await answerCorrect(result)

    await waitFor(() => expect(result.current.done).toBe(true))
  })

  it('slow-but-correct answers on the final `full` stage still internalize it', async () => {
    const { result } = renderHook(() =>
      useLessonDrill('full', { rng: makeRng(13), durationMs: 999_999 }),
    )
    await waitFor(() => expect(result.current.current).not.toBeNull())

    // Five deliberately slow correct answers — with no speed gate they all count.
    for (let i = 0; i < 5; i++) await answerCorrect(result)
    await waitFor(() => expect(result.current.done).toBe(true))
  })

  it('finishing the last stage (full) latches every stage and unlocks Practice', async () => {
    const { CURRICULUM } = await import('./curriculum')
    const { markStageComplete } = await import('./learnGate')
    // Internalize the first six stages so only `full` (the new last stage) remains.
    for (const s of CURRICULUM.slice(0, -1)) await markStageComplete(s.id)

    const { result } = renderHook(() => useLessonDrill('full', { rng: makeRng(31) }))
    await waitFor(() => expect(result.current.current).not.toBeNull())
    for (let i = 0; i < 5; i++) await answerCorrect(result)
    await waitFor(() => expect(result.current.done).toBe(true))

    // Completing `full` (the last stage) unions it in and flips the latch — every
    // curriculum id is now present regardless of insertion order.
    await waitFor(async () =>
      expect(new Set(await getMeta<string[]>('learnCompleted', []))).toEqual(
        new Set(CURRICULUM.map((s) => s.id)),
      ),
    )
    await waitFor(async () => expect(await getMeta<boolean>('practiceUnlocked', false)).toBe(true))
  })

  it('resumes derived progress from the persisted log on remount (StrictMode-safe)', async () => {
    const first = renderHook(() => useLessonDrill('mod7', { rng: makeRng(15) }))
    await waitFor(() => expect(first.result.current.current).not.toBeNull())
    await answerCorrect(first.result)
    await answerCorrect(first.result)
    await waitFor(async () => expect((await listAttempts()).length).toBe(2))

    first.unmount()
    const second = renderHook(() => useLessonDrill('mod7', { rng: makeRng(16) }))
    await waitFor(() => expect(second.result.current.current).not.toBeNull())

    // Remount must NOT re-record the two prior rows.
    await answerCorrect(second.result)
    await waitFor(async () => expect((await listAttempts()).length).toBe(3))
    expect(second.result.current.progress.correctInWindow).toBe(3)
  })

  it('shows live window progress with the true remaining count', async () => {
    const { result } = renderHook(() => useLessonDrill('mod7', { rng: makeRng(17) }))
    await waitFor(() => expect(result.current.current).not.toBeNull())

    await answerCorrect(result)
    await waitFor(() => expect(result.current.progress.correctInWindow).toBe(1))
    // mod7 is K=5,M=5. After 1 correct rep, 4 more correct reps still stand
    // between here and done.
    expect(result.current.progress.remaining).toBe(4)
  })

  it('practice mode logs :practice rows, never latches completion, and credits the streak', async () => {
    const { result } = renderHook(() => useLessonDrill('mod7', { rng: makeRng(21), practice: true }))
    await waitFor(() => expect(result.current.current).not.toBeNull())

    for (let i = 0; i < 5; i++) await answerCorrect(result)

    const all = await listAttempts()
    expect(all).toHaveLength(5)
    expect(all.every((a) => a.mode === 'learn:mod7:practice')).toBe(true)
    // :practice rows are invisible to the stage's mastery window …
    expect(stageOutcomes(all, 'mod7')).toEqual([])
    // … and never latch completion …
    expect(await getMeta<string[]>('learnCompleted', [])).not.toContain('mod7')
    // … but a correct practice rep still keeps the daily streak alive.
    expect(await getMeta<number>('currentStreak', 0)).toBe(1)
  })

  it('practice mode starts a fresh window even when the stage is already internalized', async () => {
    // Internalize mod7 the normal way first.
    const learn = renderHook(() => useLessonDrill('mod7', { rng: makeRng(22) }))
    await waitFor(() => expect(learn.result.current.current).not.toBeNull())
    for (let i = 0; i < 5; i++) await answerCorrect(learn.result)
    await waitFor(() => expect(learn.result.current.done).toBe(true))
    learn.unmount()

    // Re-enter in practice mode: done must be false (fresh window), not resumed from the log.
    const practice = renderHook(() => useLessonDrill('mod7', { rng: makeRng(23), practice: true }))
    await waitFor(() => expect(practice.result.current.current).not.toBeNull())
    expect(practice.result.current.done).toBe(false)
  })
})
