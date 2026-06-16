import { describe, it, expect, beforeEach } from 'vitest'
import { getDb, STORES, _resetDbForTests } from './db'

describe('getDb', () => {
  beforeEach(async () => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })
  it('creates all object stores', async () => {
    const db = await getDb()
    for (const s of Object.values(STORES)) expect(db.objectStoreNames.contains(s)).toBe(true)
  })
  it('attempts store has a by-timestamp index', async () => {
    const db = await getDb()
    const tx = db.transaction(STORES.attempts)
    expect(tx.store.indexNames.contains('byTimestamp')).toBe(true)
  })
})
