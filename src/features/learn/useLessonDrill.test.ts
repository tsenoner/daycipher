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
import { _resetDbForTests } from '../../db/db'

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

  it('stage 7 (speed) writes a timed row carrying durationMs', () => {
    const p = nextLessonProblem('speed', makeRng(5))
    const a = gradeLesson(p, p.correct, 1234, 10)
    expect(a.mode).toBe('learn:speed')
    expect(a.timed).toBe(true)
    expect(a.durationMs).toBe(1234)
    expect(a.correct).toBe(true)
  })

  it('a wrong stage-2 answer is recorded as incorrect', () => {
    const p = nextLessonProblem('months', makeRng(2))
    const a = gradeLesson(p, p.correct === 0 ? 1 : 0, 0, 10)
    expect(a.correct).toBe(false)
  })
})

describe('useLessonDrill', () => {
  beforeEach(async () => {
    _resetDbForTests()
    // Await the delete so a late write from a prior test's in-flight effect can't
    // leak into this test's fresh database.
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('daycipher')
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })

  it('K-of-M correct answers internalize the stage (mod7: 3 of 4)', async () => {
    const { result } = renderHook(() => useLessonDrill('mod7', { rng: makeRng(7) }))
    await waitFor(() => expect(result.current.current).not.toBeNull())

    expect(result.current.done).toBe(false)
    for (let i = 0; i < 4; i++) await answerCorrect(result)

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

    // mod7 rule is K=3,M=4. Sequence [F,F,F,T,T,T,T] (oldest->newest) must complete:
    // last 4 = [T,T,T,T] >= 3 correct.
    await answerWrong(result)
    await answerWrong(result)
    await answerWrong(result)
    for (let i = 0; i < 4; i++) await answerCorrect(result)

    await waitFor(() => expect(result.current.done).toBe(true))
  })

  it('stage 7 (speed) requires answers within SPEED_MS to count toward completion', async () => {
    const { result } = renderHook(() =>
      useLessonDrill('speed', { rng: makeRng(13), durationMs: 9999 }),
    )
    await waitFor(() => expect(result.current.current).not.toBeNull())

    // Five fast-but-too-slow correct answers: correct rows, but none count (>SPEED_MS).
    for (let i = 0; i < 5; i++) await answerCorrect(result)
    expect(result.current.done).toBe(false)

    // Five answers within the speed budget now internalize the stage.
    for (let i = 0; i < 5; i++) await answerCorrect(result, 1000)
    await waitFor(() => expect(result.current.done).toBe(true))
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
    // mod7 is K=3,M=4. After 1 rep the M-rep gap (4-1=3) dominates the K gap (3-1=2),
    // so remaining never understates how many reps still stand between here and done.
    expect(result.current.progress.remaining).toBe(3)
  })
})
