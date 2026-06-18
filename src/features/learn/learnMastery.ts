import type { Attempt } from '../../db/db'

/** A stage is internalized at "K of the last M" correct outcomes. */
export interface StageRule {
  K: number
  M: number
}

/** Stage 7 (`speed`) only credits answers solved within this many ms. */
export const SPEED_MS = 5000

/**
 * Per-stage completion thresholds (R6). Stages 1–2 are single-fact on-ramps
 * (clear in 4 reps); stages 3–7 use the default 4-of-5. Window slides — never resets.
 */
export const STAGE_RULES: Record<string, StageRule> = {
  mod7: { K: 3, M: 4 },
  months: { K: 3, M: 4 },
  thisyear: { K: 4, M: 5 },
  century: { K: 4, M: 5 },
  year: { K: 4, M: 5 },
  full: { K: 4, M: 5 },
  speed: { K: 4, M: 5 }, // outcome already folds time
}

const DEFAULT_RULE: StageRule = { K: 4, M: 5 }

export function ruleFor(stageId: string): StageRule {
  return STAGE_RULES[stageId] ?? DEFAULT_RULE
}

/**
 * The boolean fed to the sliding window for one attempt. Stages 1–6 use raw
 * correctness; stage 7 additionally requires a timed answer within `SPEED_MS`.
 */
export function perStageOutcome(a: Attempt, stageId: string): boolean {
  if (stageId === 'speed') {
    return a.correct && a.timed && a.durationMs <= SPEED_MS
  }
  return a.correct
}

export interface StageProgress {
  done: boolean
  /** trailing M outcomes, oldest→newest (fewer than M before enough reps) */
  window: boolean[]
  correctInWindow: number
  /** true answers still needed to reach K, floored at 0 */
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
  const remaining = Math.max(0, rule.K - correctInWindow)
  return { done, window, correctInWindow, remaining }
}

/**
 * Derive completion straight from the attempt log — no persisted counter, so a
 * double-apply can't corrupt it. `attempts` is newest-first (`listAttempts`).
 */
export function isStageDone(attempts: Attempt[], stageId: string): boolean {
  const outcomes = attempts
    .filter((a) => a.mode === `learn:${stageId}`)
    .reverse() // oldest-first
    .map((a) => perStageOutcome(a, stageId))
  return stageProgress(outcomes, ruleFor(stageId)).done
}
