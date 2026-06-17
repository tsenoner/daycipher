import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDaily } from './useDaily'
import { listAttempts } from '../../db/attempts'
import { getMeta } from '../../db/meta'
import { localDayKey } from '../../lib/datekey'
import { _resetDbForTests } from '../../db/db'

describe('useDaily', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })

  it('counts partial answers and resumes a reload without re-recording them', async () => {
    const key = localDayKey()

    const first = renderHook(() => useDaily())
    await waitFor(() => expect(first.result.current.prior).not.toBeUndefined())
    const total = first.result.current.dates.length

    // Answer the first two questions, then confirm both are persisted.
    await act(async () => first.result.current.answer(0))
    await act(async () => first.result.current.answer(0))
    await waitFor(async () =>
      expect((await getMeta<number[]>('dailyAnswers:' + key, [])).length).toBe(2),
    )
    expect(await listAttempts()).toHaveLength(2) // partial progress counts
    expect(first.result.current.index).toBe(2)

    // "Reload": unmount and mount a fresh instance for the same day.
    first.unmount()
    const second = renderHook(() => useDaily())
    await waitFor(() => expect(second.result.current.index).toBe(2)) // resumed, not restarted

    // Finish the remaining questions.
    for (let i = 2; i < total; i++) {
      await act(async () => second.result.current.answer(0))
    }
    await waitFor(() => expect(second.result.current.prior).toMatchObject({ total }))

    expect(await listAttempts()).toHaveLength(total) // 5 total, not 7
  })
})
