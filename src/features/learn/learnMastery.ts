import type { Attempt } from '../../db/db'
import { CURRICULUM, getStage } from './curriculum'

/** A stage is internalized at "K of the last M" correct outcomes. */
export interface StageRule {
  K: number
  M: number
}

/** A timed stage only credits answers solved within this many ms. */
export const SPEED_MS = 5000

const DEFAULT_RULE: StageRule = { K: 4, M: 5 }

/**
 * Per-stage completion thresholds (R6), DERIVED from `CURRICULUM` so the data
 * lives in one place. Stages 1–2 are single-fact on-ramps (3-of-4); the rest use
 * the default 4-of-5. Window slides — never resets. Built once at module load so
 * each rule object is reference-STABLE per stage: `useLessonDrill` depends on the
 * rule in a `useEffect` dep array, and a fresh object per render would loop it.
 */
export const STAGE_RULES: Record<string, StageRule> = Object.fromEntries(
  CURRICULUM.map((s) => [s.id, { K: s.k ?? DEFAULT_RULE.K, M: s.m ?? DEFAULT_RULE.M }]),
)

export function ruleFor(stageId: string): StageRule {
  return STAGE_RULES[stageId] ?? DEFAULT_RULE
}

/**
 * The boolean fed to the sliding window for one attempt. Non-timed stages use raw
 * correctness; a timed stage (driven by `Stage.timed`) additionally requires a
 * timed answer within `SPEED_MS`.
 */
export function perStageOutcome(a: Attempt, stageId: string): boolean {
  const timed = getStage(stageId)?.timed ?? false
  if (timed) {
    return a.correct && a.timed && a.durationMs <= SPEED_MS
  }
  return a.correct
}

/**
 * Project the attempt log into this stage's sliding-window outcome list,
 * oldest→newest. Filters `learn:<stageId>` rows out of a newest-first
 * `listAttempts()` result, then maps each through `perStageOutcome`.
 */
export function stageOutcomes(attempts: Attempt[], stageId: string): boolean[] {
  return attempts
    .filter((a) => a.mode === `learn:${stageId}`)
    .reverse() // oldest-first
    .map((a) => perStageOutcome(a, stageId))
}

export interface StageProgress {
  done: boolean
  /** trailing M outcomes, oldest→newest (fewer than M before enough reps) */
  window: boolean[]
  correctInWindow: number
  /** reps still needed to be DONE — the larger of the K-correct gap and the
   *  M-rep gap, floored at 0. Reaches 0 exactly when the stage is done. */
  remaining: number
}

/**
 * Pure window evaluation over an oldest→newest outcome list. DONE iff at least M
 * outcomes exist and the trailing M contain at least K trues — so a single slip
 * slides out of the window rather than wiping accumulated progress.
 */
export function stageProgress(outcomes: boolean[], rule: StageRule): StageProgress {
  const window = outcomes.slice(-rule.M)
  const correctInWindow = window.filter(Boolean).length
  const done = outcomes.length >= rule.M && correctInWindow >= rule.K
  // Never read 0 while still not done: even with K corrects in hand, at least
  // M total reps are required, so the M-rep gap keeps `remaining` >= 1 until done.
  const remaining = Math.max(0, rule.K - correctInWindow, rule.M - outcomes.length)
  return { done, window, correctInWindow, remaining }
}

/**
 * Derive completion straight from the attempt log — no persisted counter, so a
 * double-apply can't corrupt it. `attempts` is newest-first (`listAttempts`).
 */
export function isStageDone(attempts: Attempt[], stageId: string): boolean {
  return stageProgress(stageOutcomes(attempts, stageId), ruleFor(stageId)).done
}
