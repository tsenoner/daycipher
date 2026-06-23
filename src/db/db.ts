import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export const STORES = {
  attempts: 'attempts',
  meta: 'meta',
} as const

export interface Attempt {
  id?: number
  timestamp: number
  targetDate: string // ISO yyyy-mm-dd
  correctWeekday: number
  guessedWeekday: number
  correct: boolean
  durationMs: number
  mode: string
  anchorCorrect: 0 | 1 | null
  yearDoomCorrect: 0 | 1 | null
  monthAnchorCorrect: 0 | 1 | null
  offsetCorrect: 0 | 1 | null
  timed: boolean
}

export interface MetaRecord {
  key: string
  value: unknown
}

interface DaycipherDB extends DBSchema {
  attempts: { key: number; value: Attempt; indexes: { byTimestamp: number } }
  meta: { key: string; value: MetaRecord }
}

let dbPromise: Promise<IDBPDatabase<DaycipherDB>> | null = null

export function getDb(): Promise<IDBPDatabase<DaycipherDB>> {
  if (!dbPromise) {
    const opening = openDB<DaycipherDB>('daycipher', 1, {
      upgrade(db) {
        const attempts = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true })
        attempts.createIndex('byTimestamp', 'timestamp')
        db.createObjectStore('meta', { keyPath: 'key' })
      },
    })
    // Don't memoize a rejection: if the open fails (e.g. IndexedDB blocked in
    // private mode), drop the cached promise so the next call can retry.
    opening.catch(() => {
      if (dbPromise === opening) dbPromise = null
    })
    dbPromise = opening
  }
  return dbPromise
}

/** Test helper: drop the cached connection so a fresh deleteDatabase takes effect. */
export function _resetDbForTests(): Promise<void> {
  // Close any open connection first; an open connection blocks deleteDatabase.
  // Return the close promise so a test can await it before deleteDatabase — an
  // un-awaited close races the delete and can leak state between tests.
  const closing = dbPromise?.then((db) => db.close()).catch(() => {})
  dbPromise = null
  return Promise.resolve(closing)
}
