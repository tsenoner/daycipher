import { getDb, type Attempt } from './db'

export async function addAttempt(a: Attempt): Promise<number> {
  const db = await getDb()
  return db.add('attempts', a) as Promise<number>
}

/** All attempts, newest first. */
export async function listAttempts(): Promise<Attempt[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('attempts', 'byTimestamp')
  return all.reverse()
}

const localDayKey = (ts: number): string => {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Map of local-day -> attempt count, for the heatmap. */
export async function countByDay(): Promise<Record<string, number>> {
  const all = await listAttempts()
  const out: Record<string, number> = {}
  for (const a of all) out[localDayKey(a.timestamp)] = (out[localDayKey(a.timestamp)] ?? 0) + 1
  return out
}
