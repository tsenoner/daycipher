import { generateDate, generateWideDate } from '../../engine'

export interface LevelDef {
  /** Stable id (never the array index). */
  id: 'recent' | 'ad' | 'full'
  /** Display label. */
  label: string
  /** Inclusive year range to generate from; null = the full proleptic warp. */
  range: { minYear: number; maxYear: number } | null
}

export const LEVELS: readonly LevelDef[] = [
  { id: 'recent', label: 'Recent (1700–2100)', range: { minYear: 1700, maxYear: 2100 } },
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

export const LEVEL_TEST_SIZE = 10
export const LEVEL_TEST_PASS = 9

/** Level-test pass rule: at least 9 of 10 correct. */
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

export const TIER_LABELS: Record<Tier, string> = { 0: '—', 1: 'Bronze', 2: 'Silver', 3: 'Gold' }
export const TIER_BADGES: Record<Tier, string> = { 0: '', 1: '🥉', 2: '🥈', 3: '🥇' }

/** Map an Ao5 time (ms, or null = DNF) to a speed tier. */
export function tierForAo5(ms: number | null): Tier {
  if (ms === null) return 0
  if (ms < 2000) return 3
  if (ms < 5000) return 2
  if (ms < 10000) return 1
  return 0
}
