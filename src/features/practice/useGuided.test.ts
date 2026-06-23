import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useGuided } from './useGuided'
import { nextProblem } from './selector'
import { setMeta } from '../../db/meta'
import { _resetDbForTests } from '../../db/db'

// Keep the real selector (so a valid Problem is produced) but spy the draw to
// assert which level the first problem is generated at.
vi.mock('./selector', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./selector')>()
  return { ...actual, nextProblem: vi.fn(actual.nextProblem) }
})
const mockNext = vi.mocked(nextProblem)

async function resetDb() {
  await _resetDbForTests()
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('daycipher')
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
}

describe('useGuided — first problem respects the unlocked level (#21)', () => {
  beforeEach(async () => {
    await resetDb()
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
