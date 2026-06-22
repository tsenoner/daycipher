import { generateDate, generateWideDate } from '../../engine'
import { formatYear } from '../../lib/format'

export interface LevelDef {
  /** Stable id (never the array index). */
  id: 'recent' | 'ad' | 'full'
  /** Display label. */
  label: string
  /** Inclusive year range to generate from; null = the full proleptic warp. */
  range: { minYear: number; maxYear: number } | null
}

/** The base teaching range — Level 0, and the range Learn's capstone stays within. */
export const RECENT_RANGE = { minYear: 1700, maxYear: 2100 }

export const LEVELS: readonly LevelDef[] = [
  {
    id: 'recent',
    label: `Recent (${formatYear(RECENT_RANGE.minYear)}–${formatYear(RECENT_RANGE.maxYear)})`,
    range: RECENT_RANGE,
  },
  { id: 'ad', label: 'All AD years', range: { minYear: 1, maxYear: 9999 } },
  { id: 'full', label: 'Full range', range: null },
]

export const MAX_LEVEL = LEVELS.length - 1

/** Clamp a stored/arbitrary level into a valid index. */
export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.min(MAX_LEVEL, Math.floor(level)))
}

/** The single next level a learner may attempt, or null at the top. */
export function nextTakeableLevel(unlocked: number): number | null {
  const u = clampLevel(unlocked)
  return u >= MAX_LEVEL ? null : u + 1
}

/** Generate one problem date for a level's range. */
export function generateForLevel(
  level: number,
  rng: () => number = Math.random,
): { year: number; month: number; day: number } {
  const def = LEVELS[clampLevel(level)]
  return def.range ? generateDate(def.range, rng) : generateWideDate(rng)
}

/** Canonical level-test length; the (later) test runner draws this many problems. */
export const LEVEL_TEST_SIZE = 10
/** Correct answers needed to pass a level test. */
export const LEVEL_TEST_PASS = 9

/** Level-test pass rule: at least LEVEL_TEST_PASS of LEVEL_TEST_SIZE correct. */
export function gradeLevelTest(correctCount: number): boolean {
  return correctCount >= LEVEL_TEST_PASS
}

export const AO5_SIZE = 5

export interface SpeedSolve {
  ms: number
  correct: boolean
}

/**
 * Speedcubing Average-of-5: a wrong solve is a DNF (treated as +∞). Drop the
 * single fastest and single slowest, then mean the middle 3. Returns ms, or
 * null (DNF) when fewer than exactly 5 solves, or when ≥2 are wrong (a DNF then
 * survives into the middle 3).
 */
export function ao5(solves: SpeedSolve[]): number | null {
  if (solves.length !== AO5_SIZE) return null
  if (solves.filter((s) => !s.correct).length >= 2) return null
  const times = solves.map((s) => (s.correct ? s.ms : Infinity)).sort((a, b) => a - b)
  const middle = times.slice(1, AO5_SIZE - 1)
  return Math.round(middle.reduce((sum, t) => sum + t, 0) / middle.length)
}

export type Tier = 0 | 1 | 2 | 3 // none, bronze, silver, gold

/**
 * Single source of truth for the speed tiers, best first. `maxMs` is the
 * exclusive Ao5 ceiling (ms) to earn the tier; the `none` row (Infinity) catches
 * the rest. Threshold, label and badge travel together so a tier is one edit.
 */
export const SPEED_TIERS: readonly { tier: Tier; label: string; badge: string; maxMs: number }[] = [
  { tier: 3, label: 'Gold', badge: '🥇', maxMs: 2000 },
  { tier: 2, label: 'Silver', badge: '🥈', maxMs: 5000 },
  { tier: 1, label: 'Bronze', badge: '🥉', maxMs: 10000 },
  { tier: 0, label: '—', badge: '', maxMs: Infinity },
]

export const TIER_LABELS = Object.fromEntries(SPEED_TIERS.map((t) => [t.tier, t.label])) as Record<Tier, string>
export const TIER_BADGES = Object.fromEntries(SPEED_TIERS.map((t) => [t.tier, t.badge])) as Record<Tier, string>

/** Map an Ao5 time (ms, or null = DNF) to a speed tier. */
export function tierForAo5(ms: number | null): Tier {
  if (ms === null) return 0
  // The `none` row (maxMs: Infinity) always matches a finite ms, so `find` never
  // returns undefined here — the `?? 0` only satisfies its Tier | undefined type.
  return SPEED_TIERS.find((t) => ms < t.maxMs)?.tier ?? 0
}
