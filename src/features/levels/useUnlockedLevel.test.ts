import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUnlockedLevel } from './useUnlockedLevel'
import { _resetDbForTests } from '../../db/db'
import { setMeta } from '../../db/meta'

describe('useUnlockedLevel', () => {
  beforeEach(async () => {
    // Await the close, then the delete, so a prior test's unlockedLevel write
    // can't leak into the next test (the un-awaited form races, per _resetDbForTests).
    await _resetDbForTests()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('daycipher')
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })

  it('defaults to 0, then resolves to the stored (clamped) level', async () => {
    await setMeta('unlockedLevel', 2)
    const { result } = renderHook(() => useUnlockedLevel())
    expect(result.current.ref.current).toBe(0) // before load
    expect(result.current.loaded).toBe(false)
    await waitFor(() => expect(result.current.level).toBe(2))
    expect(result.current.ref.current).toBe(2)
    expect(result.current.loaded).toBe(true)
  })
})
