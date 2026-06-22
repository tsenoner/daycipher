import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useLevelTest } from './useLevelTest'
import { LEVEL_TEST_SIZE } from './levels'
import { _resetDbForTests } from '../../db/db'
import { getMeta } from '../../db/meta'
import { weekdayOfYMD, type Weekday } from '../../engine'

const rng = () => 0.5

/** Answer the current problem either correctly or wrong, then advance. */
function play(result: { current: ReturnType<typeof useLevelTest> }, correct: boolean) {
  const p = result.current.problem
  const right = weekdayOfYMD(p.year, p.month, p.day)
  const guess = (correct ? right : ((right + 1) % 7)) as Weekday
  act(() => result.current.answer(guess))
  act(() => result.current.next())
}

describe('useLevelTest', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })

  it('unlocks the target level on 9/10', async () => {
    const { result } = renderHook(() => useLevelTest(1, { rng, durationMs: 10 }))
    for (let i = 0; i < LEVEL_TEST_SIZE; i++) play(result, i !== 0) // 9 correct, 1 wrong
    expect(result.current.phase).toBe('done')
    expect(result.current.passed).toBe(true)
    await waitFor(async () => expect(await getMeta('unlockedLevel', 0)).toBe(1))
  })

  it('does NOT unlock on 8/10 and can be retried', async () => {
    const { result } = renderHook(() => useLevelTest(1, { rng, durationMs: 10 }))
    for (let i = 0; i < LEVEL_TEST_SIZE; i++) play(result, i >= 2) // 8 correct
    expect(result.current.passed).toBe(false)
    expect(await getMeta('unlockedLevel', 0)).toBe(0)
  })
})
