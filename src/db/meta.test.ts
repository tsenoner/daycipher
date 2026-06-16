import { describe, it, expect, beforeEach } from 'vitest'
import { getMeta, setMeta, recordPracticeDay } from './meta'
import { _resetDbForTests } from './db'

describe('meta', () => {
  beforeEach(async () => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })

  it('round-trips values with a default', async () => {
    expect(await getMeta('theme', 'system')).toBe('system')
    await setMeta('theme', 'dark')
    expect(await getMeta('theme', 'system')).toBe('dark')
  })

  it('increments streak on consecutive days and resets after a gap', async () => {
    expect((await recordPracticeDay('2026-06-14')).currentStreak).toBe(1)
    expect((await recordPracticeDay('2026-06-14')).currentStreak).toBe(1) // same day, no change
    expect((await recordPracticeDay('2026-06-15')).currentStreak).toBe(2)
    const afterGap = await recordPracticeDay('2026-06-18') // missed 16,17
    expect(afterGap.currentStreak).toBe(1)
    expect(afterGap.longestStreak).toBe(2)
  })
})
