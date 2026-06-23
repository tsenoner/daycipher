import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUnlockedLevel } from './useUnlockedLevel'
import { resetTestDb } from '../../test/resetDb'
import { setMeta } from '../../db/meta'

describe('useUnlockedLevel', () => {
  beforeEach(resetTestDb)

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
