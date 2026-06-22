import { describe, it, expect, beforeEach } from 'vitest'
import { getMeta, setMeta, recordPracticeDay, raiseMeta } from './meta'
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

  it('raiseMeta only ever raises (monotonic) and is idempotent', async () => {
    expect(await raiseMeta('unlockedLevel', 1)).toBe(1)
    expect(await raiseMeta('unlockedLevel', 2)).toBe(2)
    expect(await raiseMeta('unlockedLevel', 1)).toBe(2) // a lower write can't lower it
    expect(await raiseMeta('unlockedLevel', 2)).toBe(2) // re-raising to the same value is a no-op
    expect(await getMeta('unlockedLevel', 0)).toBe(2)
  })
})
