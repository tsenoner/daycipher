import { describe, it, expect, beforeEach } from 'vitest'
import { runPracticeUnlockMigration } from './migration'
import { addAttempt } from '../../db/attempts'
import { getMeta, setMeta } from '../../db/meta'
import { type Attempt } from '../../db/db'
import { resetTestDb } from '../../test/resetDb'

const base = {
  targetDate: '1986-03-14',
  correctWeekday: 5,
  guessedWeekday: 5,
  correct: true,
  durationMs: 4200,
  anchorCorrect: null,
  yearDoomCorrect: null,
  monthAnchorCorrect: null,
  offsetCorrect: null,
  timed: false,
} as const

const mk = (mode: string, timestamp = 1): Attempt => ({ ...base, mode, timestamp })

const unlocked = () => getMeta<boolean>('practiceUnlocked', false)

describe('runPracticeUnlockMigration', () => {
  beforeEach(resetTestDb)

  // State F — brand-new install: no learnDone, no attempts -> gated.
  it('leaves a brand-new install gated', async () => {
    await runPracticeUnlockMigration()
    expect(await unlocked()).toBe(false)
    expect(await getMeta<string[]>('learnCompleted', [])).toEqual([])
  })

  // State A — power user with practice attempts, never did Learn -> unlocked.
  it('grandfathers a user with prior practice attempts', async () => {
    await addAttempt(mk('quick'))
    await runPracticeUnlockMigration()
    expect(await unlocked()).toBe(true)
    expect(await getMeta<string[]>('learnCompleted', [])).toEqual([]) // nothing to seed
  })

  // State D/H — only daily rows: `daily` is kept by practiceAttempts -> unlocked.
  it('grandfathers a daily-only user', async () => {
    await addAttempt(mk('daily'))
    await runPracticeUnlockMigration()
    expect(await unlocked()).toBe(true)
  })

  // State B — touched the old Learn (learnDone non-empty) -> unlocked + seeded.
  it('grandfathers an old-Learn user and seeds learnCompleted from learnDone', async () => {
    await setMeta('learnDone', ['mod7', 'months'])
    await runPracticeUnlockMigration()
    expect(await unlocked()).toBe(true)
    expect(await getMeta<string[]>('learnCompleted', [])).toEqual(['mod7', 'months'])
  })

  // State G — the critical fix: only `learn:*` rows (lesson reps) must NOT
  // grandfather, even after running twice (a reload).
  it('keeps a lesson-only new user gated, and stays gated when run twice', async () => {
    await addAttempt(mk('learn:mod7'))
    await runPracticeUnlockMigration()
    expect(await unlocked()).toBe(false)
    await runPracticeUnlockMigration() // reload: still no practice/daily rows
    expect(await unlocked()).toBe(false)
    expect(await getMeta<string[]>('learnCompleted', [])).toEqual([])
  })

  // Idempotent: once latched, a second run is a no-op and never re-seeds.
  it('early-returns when already unlocked', async () => {
    await setMeta('practiceUnlocked', true)
    await setMeta('learnDone', ['mod7']) // would seed if it didn't early-return
    await runPracticeUnlockMigration()
    expect(await unlocked()).toBe(true)
    expect(await getMeta<string[]>('learnCompleted', [])).toEqual([])
  })
})
