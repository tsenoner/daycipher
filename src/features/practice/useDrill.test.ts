import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useDrill } from './useDrill'
import { nextProblem } from './selector'
import { setMeta } from '../../db/meta'
import { resetTestDb } from '../../test/resetDb'

// Keep the real selector (so a valid Problem is produced) but spy the draw to
// assert which level the first problem is generated at.
vi.mock('./selector', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./selector')>()
  return { ...actual, nextProblem: vi.fn(actual.nextProblem) }
})
const mockNext = vi.mocked(nextProblem)

describe('useDrill — first problem respects the unlocked level (#21)', () => {
  beforeEach(async () => {
    await resetTestDb()
    mockNext.mockClear()
  })

  it('regenerates problem #1 at the unlocked level once it resolves', async () => {
    await setMeta('unlockedLevel', 2)
    const { result } = renderHook(() => useDrill())
    const seeded = result.current.problem
    // Lazy seed runs before the async read lands → level 0.
    expect(mockNext).toHaveBeenCalledWith([], 0)
    // After the read resolves, the first problem is redrawn at the real level...
    await waitFor(() => expect(mockNext.mock.calls.some((c) => c[1] === 2)).toBe(true))
    // ...and the displayed first problem is actually swapped out.
    await waitFor(() => expect(result.current.problem).not.toBe(seeded))
  })

  it('does not regenerate when the unlocked level is 0 (default — no swap)', async () => {
    await setMeta('unlockedLevel', 0)
    const { result } = renderHook(() => useDrill())
    const seeded = result.current.problem
    await waitFor(() => expect(mockNext).toHaveBeenCalled())
    // Let the load effect settle; a level-0 resolve must NOT redraw problem #1.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
    // Seed draw only (no regen call) and the same problem object (no swap) — both
    // would break if the `if (level === 0) return` guard were removed.
    expect(mockNext).toHaveBeenCalledTimes(1)
    expect(result.current.problem).toBe(seeded)
  })
})
