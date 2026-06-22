import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSpeedChallenge } from './useSpeedChallenge'
import { AO5_SIZE } from './levels'
import { _resetDbForTests } from '../../db/db'
import { getMeta } from '../../db/meta'
import { weekdayOfYMD, type Weekday } from '../../engine'

const rng = () => 0.5

function solve(result: { current: ReturnType<typeof useSpeedChallenge> }, correct: boolean) {
  const p = result.current.problem!
  const right = weekdayOfYMD(p.year, p.month, p.day)
  const guess = (correct ? right : ((right + 1) % 7)) as Weekday
  act(() => result.current.answer(guess))
}

describe('useSpeedChallenge', () => {
  beforeEach(async () => {
    // Await the close, then the delete, so a prior test's best-tier write can't
    // leak into the next test (the un-awaited form races, per _resetDbForTests).
    await _resetDbForTests()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('daycipher')
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })

  it('computes a silver Ao5 and stores the best tier', async () => {
    // durationMs fixed at 3000 → Ao5 3000 → silver (tier 2)
    const { result } = renderHook(() => useSpeedChallenge({ rng, durationMs: 3000 }))
    act(() => result.current.start())
    for (let i = 0; i < AO5_SIZE; i++) solve(result, true)
    expect(result.current.phase).toBe('done')
    expect(result.current.result).toBe(3000)
    expect(result.current.tier).toBe(2)
    await waitFor(async () => expect(await getMeta('speedBestTier', 0)).toBe(2))
    expect(await getMeta('speedBestAo5', 0)).toBe(3000)
  })

  it('is DNF (no tier) with two wrong solves', async () => {
    const { result } = renderHook(() => useSpeedChallenge({ rng, durationMs: 1000 }))
    act(() => result.current.start())
    solve(result, false)
    solve(result, false)
    for (let i = 0; i < AO5_SIZE - 2; i++) solve(result, true)
    expect(result.current.result).toBeNull()
    expect(result.current.tier).toBe(0)
    // A DNF must not be persisted as a best time or tier (the done-effect bails
    // when result === null) — sentinels prove neither key was ever written.
    expect(await getMeta('speedBestTier', -1)).toBe(-1)
    expect(await getMeta('speedBestAo5', -1)).toBe(-1)
  })
})
