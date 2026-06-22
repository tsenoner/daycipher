import { getDb } from './db'

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const db = await getDb()
  const rec = await db.get('meta', key)
  return rec ? (rec.value as T) : fallback
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb()
  await db.put('meta', { key, value })
}

/**
 * Monotonically raise a numeric meta value to at least `value`, read-modify-write
 * in a single transaction so concurrent writers (or a StrictMode double-effect)
 * can't lost-update. Returns the resulting value.
 */
export async function raiseMeta(key: string, value: number): Promise<number> {
  const db = await getDb()
  const tx = db.transaction('meta', 'readwrite')
  const store = tx.objectStore('meta')
  const rec = await store.get(key)
  const next = Math.max(rec ? (rec.value as number) : 0, value)
  await store.put({ key, value: next })
  await tx.done
  return next
}

const dayDiff = (a: string, b: string): number =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

export interface StreakState {
  currentStreak: number
  longestStreak: number
  lastActiveDay: string
}

/** Register that the user practiced on `day` (local YYYY-MM-DD). Idempotent per day. */
export async function recordPracticeDay(day: string): Promise<StreakState> {
  const db = await getDb()
  // One transaction for the whole read-modify-write so concurrent calls (e.g. a
  // daily completion and a drill answer firing together) can't race the streak.
  const tx = db.transaction('meta', 'readwrite')
  const store = tx.objectStore('meta')
  const read = async <T>(key: string, fallback: T): Promise<T> => {
    const rec = await store.get(key)
    return rec ? (rec.value as T) : fallback
  }

  const last = await read<string | null>('lastActiveDay', null)
  let current = await read<number>('currentStreak', 0)
  let longest = await read<number>('longestStreak', 0)

  if (last !== day) {
    const gap = last ? dayDiff(last, day) : Infinity
    current = gap === 1 ? current + 1 : 1
    longest = Math.max(longest, current)
    await Promise.all([
      store.put({ key: 'currentStreak', value: current }),
      store.put({ key: 'longestStreak', value: longest }),
      store.put({ key: 'lastActiveDay', value: day }),
    ])
  }

  await tx.done
  return { currentStreak: current, longestStreak: longest, lastActiveDay: day }
}
