import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export const STORES = {
  attempts: 'attempts',
  cards: 'cards',
  skills: 'skills',
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
  offsetCorrect: 0 | 1 | null
  timed: boolean
}

export interface MetaRecord {
  key: string
  value: unknown
}

interface DaycipherDB extends DBSchema {
  attempts: { key: number; value: Attempt; indexes: { byTimestamp: number } }
  cards: { key: string; value: Record<string, unknown> }
  skills: { key: string; value: Record<string, unknown> }
  meta: { key: string; value: MetaRecord }
}

let dbPromise: Promise<IDBPDatabase<DaycipherDB>> | null = null

export function getDb(): Promise<IDBPDatabase<DaycipherDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DaycipherDB>('daycipher', 1, {
      upgrade(db) {
        const attempts = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true })
        attempts.createIndex('byTimestamp', 'timestamp')
        db.createObjectStore('cards', { keyPath: 'cardId' })
        db.createObjectStore('skills', { keyPath: 'dimension' })
        db.createObjectStore('meta', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

/** Test helper: drop the cached connection so a fresh deleteDatabase takes effect. */
export function _resetDbForTests(): void {
  // Close any open connection first; an open connection blocks deleteDatabase.
  void dbPromise?.then((db) => db.close()).catch(() => {})
  dbPromise = null
}
