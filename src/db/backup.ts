import { getDb, STORES } from './db'

export interface Backup {
  version: 1
  exportedAt: number
  attempts: unknown[]
  cards: unknown[]
  skills: unknown[]
  meta: unknown[]
}

export async function exportAll(): Promise<Backup> {
  const db = await getDb()
  const [attempts, cards, skills, meta] = await Promise.all([
    db.getAll(STORES.attempts),
    db.getAll(STORES.cards),
    db.getAll(STORES.skills),
    db.getAll(STORES.meta),
  ])
  return { version: 1, exportedAt: Date.now(), attempts, cards, skills, meta }
}

export async function importAll(data: Backup): Promise<void> {
  if (data.version !== 1) throw new Error(`Unsupported backup version: ${data.version}`)
  const db = await getDb()
  const tx = db.transaction(
    [STORES.attempts, STORES.cards, STORES.skills, STORES.meta],
    'readwrite',
  )
  await Promise.all([
    ...data.attempts.map((v) => tx.objectStore(STORES.attempts).put(v as never)),
    ...data.cards.map((v) => tx.objectStore(STORES.cards).put(v as never)),
    ...data.skills.map((v) => tx.objectStore(STORES.skills).put(v as never)),
    ...data.meta.map((v) => tx.objectStore(STORES.meta).put(v as never)),
  ])
  await tx.done
}
