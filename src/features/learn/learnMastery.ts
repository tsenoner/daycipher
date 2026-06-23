import type { Attempt } from '../../db/db'
import { CURRICULUM } from './curriculum'

/** A stage is internalized at "K of the last M" correct outcomes. */
export interface StageRule {
  K: number
  M: number
}

const DEFAULT_RULE: StageRule = { K: 4, M: 5 }

/**
 * Per-stage completion thresholds, DERIVED from `CURRICULUM` so the data lives in
 * one place. Atomic recall/single-procedure stages (`mod7`, `leap`, `months`,
 * `century`, `year`) require 5-of-5 — a no-slip streak, since those atoms feed
 * every later answer. The composite stages (`thisyear`, `full`) keep the default
 * 4-of-5: they chain all the atoms, so demanding near-perfection there is a
 * punishing signal. Window slides — never resets. Built once at module load so
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
 * The boolean fed to the sliding window for one attempt. Every stage is
 * accuracy-only: a rep counts iff it was correct, regardless of how long it took.
 * (`stageId` is retained for a stable signature and future per-stage rules.)
 */
export function perStageOutcome(a: Attempt, _stageId: string): boolean {
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
