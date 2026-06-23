import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useGuided } from './useGuided'
import { nextProblem } from './selector'
import { setMeta } from '../../db/meta'
import { resetTestDb } from '../../test/resetDb'
import { type Weekday } from '../../engine'

// Keep the real selector (so a valid Problem is produced) but spy the draw to
// assert which level the first problem is generated at.
vi.mock('./selector', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./selector')>()
  return { ...actual, nextProblem: vi.fn(actual.nextProblem) }
})
const mockNext = vi.mocked(nextProblem)

describe('useGuided — first problem respects the unlocked level (#21)', () => {
  beforeEach(async () => {
    await resetTestDb()
    mockNext.mockClear()
  })

  it('regenerates problem #1 at the unlocked level once it resolves', async () => {
    await setMeta('unlockedLevel', 2)
    const { result } = renderHook(() => useGuided())
    const seeded = result.current.problem
    expect(mockNext).toHaveBeenCalledWith([], 0)
    await waitFor(() => expect(mockNext.mock.calls.some((c) => c[1] === 2)).toBe(true))
    await waitFor(() => expect(result.current.problem).not.toBe(seeded))
  })

  it('does not regenerate when the unlocked level is 0 (default — no swap)', async () => {
    await setMeta('unlockedLevel', 0)
    const { result } = renderHook(() => useGuided())
    const seeded = result.current.problem
    await waitFor(() => expect(mockNext).toHaveBeenCalled())
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    // Seed draw only (no regen call) and the same problem object (no swap) — both
    // would break if the `if (level === 0) return` guard were removed.
    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(result.current.problem).toBe(seeded)
  })
})

describe('useGuided — month-anchor step machine (#10)', () => {
  beforeEach(async () => {
    await resetTestDb()
    mockNext.mockClear()
  })

  it('advances 0→1→2→3→4 via pick/pickAnchor and grades at the end', async () => {
    const { result } = renderHook(() => useGuided())
    expect(result.current.step).toBe(0)

    // pickAnchor is a no-op outside step 2.
    act(() => result.current.pickAnchor(14))
    expect(result.current.step).toBe(0)

    act(() => result.current.pick(3 as Weekday)) // 0 → 1 (century)
    expect(result.current.step).toBe(1)
    expect(result.current.picks.century).toBe(3)

    act(() => result.current.pick(5 as Weekday)) // 1 → 2 (year's doomsday)
    expect(result.current.step).toBe(2)

    // The number step ignores a weekday pick.
    act(() => result.current.pick(2 as Weekday))
    expect(result.current.step).toBe(2)

    act(() => result.current.pickAnchor(14)) // 2 → 3 (month anchor)
    expect(result.current.step).toBe(3)
    expect(result.current.picks.monthAnchorDay).toBe(14)

    act(() => result.current.pick(5 as Weekday)) // 3 → 4 (final → grade)
    expect(result.current.step).toBe(4)
    expect(result.current.attempt?.mode).toBe('guided')
  })
})
