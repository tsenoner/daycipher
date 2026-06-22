import { useCallback, useEffect, useRef, useState } from 'react'
import type { Weekday } from '../../engine'
import { gradeProblem, type Problem } from '../practice/drill'
import type { Attempt } from '../../db/db'
import { recordAttempt } from '../../db/attempts'
import { getMeta, setMeta } from '../../db/meta'
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

  // On a completed run, persist best (lowest) Ao5 + highest tier (monotonic).
  useEffect(() => {
    if (state.phase !== 'done' || state.result === null) return
    const result = state.result
    const tier = state.tier
    void Promise.all([getMeta<number>('speedBestAo5', 0), getMeta<number>('speedBestTier', 0)]).then(
      ([bestMs, bestTier]) => {
        if (bestMs === 0 || result < bestMs) void setMeta('speedBestAo5', result)
        if (tier > bestTier) void setMeta('speedBestTier', tier)
      },
    )
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

  return { ...state, count: state.solves.length, total: AO5_SIZE, start, answer }
}
