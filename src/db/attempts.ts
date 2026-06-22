import { localDayKey } from '../lib/datekey'
import { getDb, type Attempt } from './db'
import { recordPracticeDay } from './meta'

export async function addAttempt(a: Attempt): Promise<number> {
  const db = await getDb()
  return db.add('attempts', a) as Promise<number>
}

/**
 * Persist a graded attempt and credit the day toward the practice streak.
 * Single place every mode (quick, guided, speedrun, daily) goes through so the
 * "save + streak" pair can't drift apart per mode.
 */
export async function recordAttempt(a: Attempt): Promise<number> {
  const id = await addAttempt(a)
  await recordPracticeDay(localDayKey(a.timestamp))
  return id
}

/** All attempts, newest first. */
export async function listAttempts(): Promise<Attempt[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('attempts', 'byTimestamp')
  return all.reverse()
}

/** A lesson rep, written by the Learn drill (`mode='learn:<stageId>'`). */
export function isLearnAttempt(a: Attempt): boolean {
  return a.mode.startsWith('learn:')
}

/** Graded, streak-credited reps that are NOT "practice" for stats. One source of truth. */
const CHALLENGE_MODES = new Set(['level:test', 'speed:challenge'])

/** Level-test / speed-challenge reps — graded & streak-credited, but not "practice" for stats. */
export function isChallengeAttempt(a: Attempt): boolean {
  return CHALLENGE_MODES.has(a.mode)
}

/**
 * Drop `learn:*` reps and challenge reps so neither inflates "solved"/accuracy nor
 * steers the adaptive picker. Daily rows are kept — a Daily solve is a genuine solve.
 */
export function practiceAttempts(all: Attempt[]): Attempt[] {
  return all.filter((a) => !isLearnAttempt(a) && !isChallengeAttempt(a))
}

/** Map of local-day -> attempt count for an already-loaded set of attempts. */
export function tallyByDay(attempts: Attempt[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const a of attempts) {
    const key = localDayKey(a.timestamp)
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}

/** Map of local-day -> attempt count, for the heatmap. */
export async function countByDay(): Promise<Record<string, number>> {
  return tallyByDay(await listAttempts())
}
