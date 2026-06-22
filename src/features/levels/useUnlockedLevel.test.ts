import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUnlockedLevel } from './useUnlockedLevel'
import { _resetDbForTests } from '../../db/db'
import { setMeta } from '../../db/meta'

describe('useUnlockedLevel', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })

  it('defaults to 0, then resolves to the stored (clamped) level', async () => {
    await setMeta('unlockedLevel', 2)
    const { result } = renderHook(() => useUnlockedLevel())
    expect(result.current.current).toBe(0) // before load
    await waitFor(() => expect(result.current.current).toBe(2))
  })
})
