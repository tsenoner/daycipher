import { describe, it, expect, beforeEach } from 'vitest'
import { exportAll, importAll, BackupFormatError, type Backup } from './backup'
import { addAttempt, listAttempts } from './attempts'
import { setMeta, getMeta } from './meta'
import { resetTestDb } from '../test/resetDb'

const base = {
  targetDate: '1986-03-14',
  correctWeekday: 5,
  guessedWeekday: 5,
  correct: true,
  durationMs: 4200,
  mode: 'quick',
  anchorCorrect: null,
  yearDoomCorrect: null,
  monthAnchorCorrect: null,
  offsetCorrect: null,
  timed: false,
} as const

describe('backup', () => {
  beforeEach(resetTestDb)

  it('exports then re-imports all data', async () => {
    await addAttempt({ ...base, timestamp: 111 })
    await setMeta('theme', 'dark')
    const dump = await exportAll()
    expect(dump.version).toBe(1)
    expect(dump.attempts).toHaveLength(1)

    await resetTestDb()
    await importAll(dump)
    expect(await listAttempts()).toHaveLength(1)
    expect(await getMeta('theme', 'system')).toBe('dark')
  })

  it('merges without overwriting existing attempts that share an id', async () => {
    await addAttempt({ ...base, timestamp: 100 }) // local row gets id 1
    const incoming: Backup = {
      version: 1,
      exportedAt: 0,
      attempts: [{ ...base, id: 1, timestamp: 200 }], // same id as the local row
      meta: [],
    }
    await importAll(incoming)
    const list = await listAttempts()
    expect(list).toHaveLength(2) // appended, not overwritten
    expect(list.map((a) => a.timestamp).sort()).toEqual([100, 200])
  })

  it('rejects malformed backups and filters bad records', async () => {
    await expect(importAll(null)).rejects.toBeInstanceOf(BackupFormatError)
    await expect(importAll({ version: 2, attempts: [], meta: [] })).rejects.toBeInstanceOf(
      BackupFormatError,
    )
    await expect(importAll({ version: 1, attempts: 'nope', meta: [] })).rejects.toBeInstanceOf(
      BackupFormatError,
    )

    await importAll({
      version: 1,
      attempts: [{ ...base, timestamp: 1 }, { garbage: true }],
      meta: [{ key: 'theme', value: 'dark' }, { novalue: 1 }],
    })
    expect(await listAttempts()).toHaveLength(1) // the garbage attempt was dropped
    expect(await getMeta('theme', 'system')).toBe('dark')
  })
})
