import { describe, it, expect, beforeEach } from 'vitest'
import { exportAll, importAll } from './backup'
import { addAttempt, listAttempts } from './attempts'
import { setMeta, getMeta } from './meta'
import { _resetDbForTests } from './db'

const base = {
  targetDate: '1986-03-14',
  correctWeekday: 5,
  guessedWeekday: 5,
  correct: true,
  durationMs: 4200,
  mode: 'quick',
  anchorCorrect: null,
  yearDoomCorrect: null,
  offsetCorrect: null,
  timed: false,
} as const

describe('backup', () => {
  beforeEach(async () => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })

  it('exports then re-imports all data', async () => {
    await addAttempt({ ...base, timestamp: 111 })
    await setMeta('theme', 'dark')
    const dump = await exportAll()
    expect(dump.version).toBe(1)
    expect(dump.attempts).toHaveLength(1)

    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
    await importAll(dump)
    expect(await listAttempts()).toHaveLength(1)
    expect(await getMeta('theme', 'system')).toBe('dark')
  })
})
