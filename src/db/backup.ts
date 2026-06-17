import { getDb, STORES, type Attempt, type MetaRecord } from './db'

export interface Backup {
  version: 1
  exportedAt: number
  attempts: Attempt[]
  meta: MetaRecord[]
}

export async function exportAll(): Promise<Backup> {
  const db = await getDb()
  const [attempts, meta] = await Promise.all([
    db.getAll(STORES.attempts),
    db.getAll(STORES.meta),
  ])
  return { version: 1, exportedAt: Date.now(), attempts, meta }
}

function isAttempt(v: unknown): v is Attempt {
  if (typeof v !== 'object' || v === null) return false
  const a = v as Record<string, unknown>
  return (
    typeof a.timestamp === 'number' &&
    typeof a.targetDate === 'string' &&
    typeof a.correctWeekday === 'number' &&
    typeof a.correct === 'boolean'
  )
}

function isMetaRecord(v: unknown): v is MetaRecord {
  return typeof v === 'object' && v !== null && typeof (v as Record<string, unknown>).key === 'string'
}

export class BackupFormatError extends Error {}

/**
 * Restore a backup by MERGING into the current data.
 * Attempts are re-keyed (their stored auto-increment id is dropped and a fresh
 * one is assigned) so importing never overwrites existing local attempts that
 * happen to share an id. Meta records are restored by key (last write wins).
 */
export async function importAll(data: unknown): Promise<void> {
  if (typeof data !== 'object' || data === null) {
    throw new BackupFormatError('Backup file is not a valid object.')
  }
  const d = data as Partial<Backup>
  if (d.version !== 1) throw new BackupFormatError(`Unsupported backup version: ${String(d.version)}`)
  if (!Array.isArray(d.attempts) || !Array.isArray(d.meta)) {
    throw new BackupFormatError('Backup is missing its attempts or meta list.')
  }

  const attempts = d.attempts.filter(isAttempt)
  const meta = d.meta.filter(isMetaRecord)

  const db = await getDb()
  const tx = db.transaction([STORES.attempts, STORES.meta], 'readwrite')
  await Promise.all([
    ...attempts.map((a) => {
      const fresh: Attempt = { ...a }
      delete fresh.id // let the store assign a new auto-increment id
      return tx.objectStore(STORES.attempts).add(fresh)
    }),
    ...meta.map((m) => tx.objectStore(STORES.meta).put(m)),
  ])
  await tx.done
}
