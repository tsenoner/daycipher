import { CURRICULUM } from './curriculum'
import { getMeta } from '../../db/meta'
import { getDb } from '../../db/db'

/**
 * Sequential unlock (R3): stage `i` opens iff stage `i-1` is completed. Keys off
 * curriculum order via `s.id`, never the display number `.n`.
 */
export function isStageUnlocked(id: string, completed: string[]): boolean {
  const i = CURRICULUM.findIndex((s) => s.id === id)
  if (i < 0) return false
  return i === 0 || completed.includes(CURRICULUM[i - 1].id)
}

/**
 * Practice tab lock (R4): open once the one-shot latch is set, or once every
 * stage is internalized. The latch is read here; the mastery gate only writes it.
 */
export function isPracticeUnlocked(completed: string[], practiceUnlocked: boolean): boolean {
  return practiceUnlocked || CURRICULUM.every((s) => completed.includes(s.id))
}

/** The earliest curriculum stage not yet completed, or null when all are done. */
export function nextStageId(completed: string[]): string | null {
  const next = CURRICULUM.find((s) => !completed.includes(s.id))
  return next ? next.id : null
}

/**
 * How many leading stages are completed in sequence — the COUNT of the unbroken
 * completed prefix (0..7), not an index. Drives Daily difficulty scaling (§7): a
 * gap stops the count, so Daily can widen once the prefix reaches `century`.
 */
export function unlockedDailyMaxStageIndex(completed: string[]): number {
  let i = 0
  while (i < CURRICULUM.length && completed.includes(CURRICULUM[i].id)) i++
  return i
}

/** Stage ids internalized so far (R3/R4 source of truth). */
export function getCompleted(): Promise<string[]> {
  return getMeta<string[]>('learnCompleted', [])
}

/** The one-shot Practice unlock latch (set by migration or by completing all 7). */
export function getPracticeUnlocked(): Promise<boolean> {
  return getMeta<boolean>('practiceUnlocked', false)
}

/**
 * Latch a stage into `learnCompleted` (sticky union, idempotent) and, once all 7
 * are present, flip the one-shot `practiceUnlocked`. The only writer of
 * `learnCompleted` is this mastery gate — never the legacy "Mark complete" button.
 *
 * The read-modify-write runs in ONE readwrite transaction (mirroring
 * `recordPracticeDay`) so a StrictMode double-invoke or two completions firing
 * together can't lose an update.
 */
export async function markStageComplete(stageId: string): Promise<string[]> {
  const db = await getDb()
  const tx = db.transaction('meta', 'readwrite')
  const store = tx.objectStore('meta')

  const rec = await store.get('learnCompleted')
  const completed = (rec ? rec.value : []) as string[]
  if (!completed.includes(stageId)) {
    completed.push(stageId)
    await store.put({ key: 'learnCompleted', value: completed })
  }
  if (CURRICULUM.every((s) => completed.includes(s.id))) {
    await store.put({ key: 'practiceUnlocked', value: true })
  }

  await tx.done
  return completed
}
