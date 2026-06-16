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

const dayDiff = (a: string, b: string): number =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)

export interface StreakState {
  currentStreak: number
  longestStreak: number
  lastActiveDay: string
}

/** Register that the user practiced on `day` (local YYYY-MM-DD). Idempotent per day. */
export async function recordPracticeDay(day: string): Promise<StreakState> {
  const last = await getMeta<string | null>('lastActiveDay', null)
  let current = await getMeta<number>('currentStreak', 0)
  let longest = await getMeta<number>('longestStreak', 0)

  if (last === day) return { currentStreak: current, longestStreak: longest, lastActiveDay: day }
  const gap = last ? dayDiff(last, day) : Infinity
  current = gap === 1 ? current + 1 : 1
  longest = Math.max(longest, current)

  await setMeta('currentStreak', current)
  await setMeta('longestStreak', longest)
  await setMeta('lastActiveDay', day)
  return { currentStreak: current, longestStreak: longest, lastActiveDay: day }
}
