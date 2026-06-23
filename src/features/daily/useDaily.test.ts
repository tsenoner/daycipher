import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDaily } from './useDaily'
import { dailyDates, dailyRange } from './daily'
import { gradeProblem } from '../practice/drill'
import { listAttempts, recordAttempt } from '../../db/attempts'
import { getMeta, setMeta } from '../../db/meta'
import { weekdayOfYMD } from '../../engine'
import { localDayKey } from '../../lib/datekey'
import { resetTestDb } from '../../test/resetDb'
import { markStageComplete } from '../learn/learnGate'
import { CURRICULUM } from '../learn/curriculum'

describe('useDaily', () => {
  // Await the close, then the delete, so a fully-answered prior test can't
  // leak its daily:<key> result into the next test's resume path.
  beforeEach(resetTestDb)

  it('counts partial answers and resumes a reload without re-recording them', async () => {
    const key = localDayKey()

    const first = renderHook(() => useDaily())
    await waitFor(() => expect(first.result.current.prior).not.toBeUndefined())
    const total = first.result.current.dates.length

    // Answer the first two questions correctly (a correct answer is what keeps
    // the streak alive), then confirm both are persisted.
    for (let i = 0; i < 2; i++) {
      const d = first.result.current.current!
      await act(async () => first.result.current.answer(weekdayOfYMD(d.year, d.month, d.day)))
    }
    await waitFor(async () =>
      expect((await getMeta<number[]>('dailyAnswers:' + key, [])).length).toBe(2),
    )
    expect(await listAttempts()).toHaveLength(2) // partial progress counts
    expect(first.result.current.index).toBe(2)

    // "Reload": unmount and mount a fresh instance for the same day.
    first.unmount()
    const second = renderHook(() => useDaily())
    await waitFor(() => expect(second.result.current.index).toBe(2)) // resumed, not restarted

    // Finish the remaining questions correctly, so the completed set scores > 0.
    for (let i = 2; i < total; i++) {
      const d = second.result.current.current!
      await act(async () => second.result.current.answer(weekdayOfYMD(d.year, d.month, d.day)))
    }
    await waitFor(() => expect(second.result.current.prior).toMatchObject({ total }))

    expect(await listAttempts()).toHaveLength(total) // 5 total, not 7
    // Wait for the whole finalize chain (daily result + streak credit) to land,
    // not just the in-memory `prior`, so these writes can't leak into the next test.
    await waitFor(async () => {
      expect(await getMeta('daily:' + key, null)).not.toBeNull()
      expect(await getMeta<number>('currentStreak', 0)).toBeGreaterThanOrEqual(1)
    })
  })

  it('freezes the year range at the first answer so a mid-day unlock cannot re-scope the resumed set', async () => {
    const key = localDayKey()

    // A gated learner (nothing completed, Practice locked) gets the current-year
    // range. Capture those exact dates and the grade of the first answer.
    const gatedDates = dailyDates(key, 5, dailyRange([], false))
    expect(gatedDates.every((d) => d.year === new Date().getFullYear())).toBe(true)

    const first = renderHook(() => useDaily())
    await waitFor(() => expect(first.result.current.prior).not.toBeUndefined())
    expect(first.result.current.dates).toEqual(gatedDates)

    await act(async () => first.result.current.answer(0))
    const originalGrade = first.result.current.results[0].correct
    await waitFor(async () =>
      expect((await getMeta<number[]>('dailyAnswers:' + key, [])).length).toBe(1),
    )
    // The range is now locked to the current-year set the guess was recorded under.
    expect(await getMeta('dailyRange:' + key, null)).toEqual(dailyRange([], false))
    first.unmount()

    // The learner unlocks the full range mid-day (completed prefix reaches century).
    for (const id of CURRICULUM.slice(0, 5).map((s) => s.id)) await markStageComplete(id)
    expect((await getMeta<string[]>('learnCompleted', [])).includes('century')).toBe(true)

    // Remount: the resumed set must still be the frozen current-year dates — NOT
    // the now-unlocked full range — and the saved guess must re-grade identically.
    const second = renderHook(() => useDaily())
    await waitFor(() => expect(second.result.current.index).toBe(1))
    expect(second.result.current.dates).toEqual(gatedDates)
    expect(second.result.current.results[0].correct).toBe(originalGrade)
    // Sanity: the full-range set the unlock would have produced is different.
    expect(second.result.current.dates).not.toEqual(dailyDates(key, 5, dailyRange([], true)))
  })

  it('finalizes a fully-answered run resumed before its finalize write landed', async () => {
    const key = localDayKey()
    // The gated (fresh-learner) set the hook resumes against.
    const dates = dailyDates(key, 5, dailyRange([], false))
    const total = dates.length
    // Simulate a prior session that recorded every answer (correctly — so each
    // already credited the streak) and saved them, but was interrupted before
    // writing the completion result.
    for (const d of dates) {
      await recordAttempt(gradeProblem(d, weekdayOfYMD(d.year, d.month, d.day), 0, 'daily'))
    }
    await setMeta(
      'dailyAnswers:' + key,
      dates.map((d) => weekdayOfYMD(d.year, d.month, d.day)),
    )

    const r = renderHook(() => useDaily())
    await waitFor(() => expect(r.result.current.prior).toMatchObject({ total }))

    // The resumed-complete run is now finalized: result persisted...
    expect(await getMeta('daily:' + key, null)).not.toBeNull()
    // ...and the day stays credited (each correct answer credited it during the
    // original session; the resume must not need to re-credit).
    expect(await getMeta<number>('currentStreak', 0)).toBeGreaterThanOrEqual(1)
  })
})
