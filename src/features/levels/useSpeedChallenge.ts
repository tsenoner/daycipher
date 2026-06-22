import { useCallback, useEffect, useRef, useState } from 'react'
import type { Weekday } from '../../engine'
import { gradeProblem, type Problem } from '../practice/drill'
import type { Attempt } from '../../db/db'
import { recordAttempt } from '../../db/attempts'
import { getMeta, lowerMeta, raiseMeta } from '../../db/meta'
import { ao5, AO5_SIZE, generateForLevel, tierForAo5, type SpeedSolve, type Tier } from './levels'

type Phase = 'ready' | 'solving' | 'done'
interface State {
  phase: Phase
  problem: Problem | null
  solves: SpeedSolve[]
  lastAttempt: Attempt | null
  result: number | null
  tier: Tier
}

export interface SpeedChallengeOptions {
  rng?: () => number
  /** Inject per-solve duration in tests; default is wall-clock. */
  durationMs?: number
}

export function useSpeedChallenge(opts: SpeedChallengeOptions = {}) {
  const rng = opts.rng ?? Math.random
  const [state, setState] = useState<State>({
    phase: 'ready',
    problem: null,
    solves: [],
    lastAttempt: null,
    result: null,
    tier: 0,
  })
  const startRef = useRef(0)

  // Reset the per-solve clock whenever a new problem is shown.
  useEffect(() => {
    startRef.current = performance.now()
  }, [state.problem])

  // Persist each graded attempt exactly once (outside the updater — StrictMode-safe).
  useEffect(() => {
    if (state.lastAttempt) void recordAttempt(state.lastAttempt)
  }, [state.lastAttempt])

  // On a completed run, persist best (lowest) Ao5 + highest tier — each an atomic
  // monotonic read-modify-write (StrictMode/concurrent-writer safe).
  useEffect(() => {
    if (state.phase !== 'done' || state.result === null) return
    void lowerMeta('speedBestAo5', state.result)
    void raiseMeta('speedBestTier', state.tier)
  }, [state.phase, state.result, state.tier])

  const start = useCallback(() => {
    setState({
      phase: 'solving',
      problem: generateForLevel(0, rng),
      solves: [],
      lastAttempt: null,
      result: null,
      tier: 0,
    })
  }, [rng])

  const answer = useCallback(
    (w: Weekday) => {
      setState((s) => {
        if (s.phase !== 'solving' || !s.problem) return s
        const durationMs = opts.durationMs ?? Math.round(performance.now() - startRef.current)
        const attempt: Attempt = { ...gradeProblem(s.problem, w, durationMs, 'speed:challenge'), timed: true }
        const solves: SpeedSolve[] = [...s.solves, { ms: durationMs, correct: attempt.correct }]
        if (solves.length >= AO5_SIZE) {
          const result = ao5(solves)
          return {
            ...s,
            phase: 'done',
            problem: null,
            solves,
            lastAttempt: attempt,
            result,
            tier: tierForAo5(result),
          }
        }
        return { ...s, problem: generateForLevel(0, rng), solves, lastAttempt: attempt }
      })
    },
    [opts.durationMs, rng],
  )

  // Explicit public shape (like useLevelTest) — keeps internal `solves`/`lastAttempt` private.
  return {
    phase: state.phase,
    problem: state.problem,
    count: state.solves.length,
    total: AO5_SIZE,
    result: state.result,
    tier: state.tier,
    start,
    answer,
  }
}

export interface SpeedBest {
  /** Highest tier earned (monotonic). */
  tier: Tier
  /** Best (lowest) Ao5 in ms, or null if no run has completed. */
  bestMs: number | null
  /** Reflect a just-finished run immediately — raises the tier, lowers the time. */
  record: (tier: Tier, ms: number | null) => void
}

/**
 * Loads `meta.speedBestTier` + `meta.speedBestAo5` into state (re-rendering when
 * they resolve) and returns `record(tier, ms)` to reflect a just-finished run
 * immediately — monotonic (max tier, min time), so it never round-trips through a
 * not-yet-committed write. Speed is non-gating; this only drives the badge/time
 * display.
 */
export function useSpeedBest(): SpeedBest {
  const [tier, setTier] = useState<Tier>(0)
  const [bestMs, setBestMs] = useState<number | null>(null)
  const record = useCallback((t: Tier, ms: number | null) => {
    setTier((prev) => (t > prev ? t : prev))
    if (ms !== null) setBestMs((prev) => (prev === null || ms < prev ? ms : prev))
  }, [])
  useEffect(() => {
    let active = true
    void Promise.all([
      getMeta<number>('speedBestTier', 0),
      getMeta<number | null>('speedBestAo5', null),
    ]).then(([t, ms]) => {
      if (active) record(t as Tier, ms)
    })
    return () => {
      active = false
    }
  }, [record])
  return { tier, bestMs, record }
}
