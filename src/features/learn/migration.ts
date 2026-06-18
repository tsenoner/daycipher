import { getMeta, setMeta } from '../../db/meta'
import { listAttempts, practiceAttempts } from '../../db/attempts'

/**
 * One-time grandfather migration for the Practice unlock (§8). Runs once at App
 * mount; idempotent via the `practiceUnlocked` early-return so a StrictMode
 * double-invoke or a later reload is a no-op.
 *
 * Anyone who ever practiced (any non-`learn:*` attempt — quick/guided/speedrun
 * AND `daily`) or ever touched the old Learn (`learnDone` has entries) is
 * unlocked immediately; only genuinely new installs walk the curriculum.
 *
 * The streak clause is deliberately absent: under R5 a correct *lesson* answer
 * builds the streak, so grandfathering on `longestStreak > 0` would unlock a
 * brand-new user the moment they answer one lesson question and reload —
 * defeating R4. Any pre-migration streak was earned by a practice/daily
 * `Attempt` row, which the attempt clause already catches.
 */
export async function runPracticeUnlockMigration(): Promise<void> {
  if (await getMeta<boolean>('practiceUnlocked', false)) return

  const learnDone = await getMeta<string[]>('learnDone', [])
  const attempts = await listAttempts()

  const grandfathered = learnDone.length > 0 || practiceAttempts(attempts).length > 0
  if (!grandfathered) return

  await setMeta('practiceUnlocked', true)
  // Seed `learnCompleted` from legacy progress so Learn shows prior stages. The
  // latch always wins: even if the live 4-of-5 predicate would call a seeded
  // stage not-done, unlock/lock read `learnCompleted`, never the live window.
  if (learnDone.length) await setMeta('learnCompleted', learnDone)
}
