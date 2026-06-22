import { useCallback, useEffect, useRef, useState } from 'react'
import type { Weekday } from '../../engine'
import { gradeProblem, type Problem } from '../practice/drill'
import type { Attempt } from '../../db/db'
import { recordAttempt } from '../../db/attempts'
import { raiseMeta } from '../../db/meta'
import { clampLevel, generateForLevel, gradeLevelTest, LEVEL_TEST_SIZE } from './levels'

type Phase = 'answering' | 'graded' | 'done'
interface State {
  problem: Problem
  index: number
  correctCount: number
  phase: Phase
  guessed: Weekday | null
  attempt: Attempt | null
  passed: boolean
}

export interface LevelTestOptions {
  rng?: () => number
  /** Inject the per-answer duration in tests; default is wall-clock. */
  durationMs?: number
}

export function useLevelTest(targetLevel: number, opts: LevelTestOptions = {}) {
  const rng = opts.rng ?? Math.random
  const target = clampLevel(targetLevel)
  const [state, setState] = useState<State>(() => ({
    problem: generateForLevel(target, rng),
    index: 0,
    correctCount: 0,
    phase: 'answering',
    guessed: null,
    attempt: null,
    passed: false,
  }))
  const startRef = useRef(performance.now())

  // Start the clock when a fresh problem is shown (outside the updater, which
  // StrictMode double-invokes).
  useEffect(() => {
    startRef.current = performance.now()
  }, [state.problem])

  // Persist each graded attempt exactly once.
  useEffect(() => {
    if (state.attempt) void recordAttempt(state.attempt)
  }, [state.attempt])

  // On a passing finish, raise the unlocked level (atomic monotonic max — safe
  // against a StrictMode double-effect or a concurrent writer).
  useEffect(() => {
    if (state.phase === 'done' && state.passed) void raiseMeta('unlockedLevel', target)
  }, [state.phase, state.passed, target])

  const answer = useCallback(
    (w: Weekday) => {
      setState((s) => {
        if (s.phase !== 'answering') return s
        const durationMs = opts.durationMs ?? Math.round(performance.now() - startRef.current)
        const attempt = gradeProblem(s.problem, w, durationMs, 'level:test')
        return {
          ...s,
          phase: 'graded',
          guessed: w,
          attempt,
          correctCount: s.correctCount + (attempt.correct ? 1 : 0),
        }
      })
    },
    [opts.durationMs],
  )

  const next = useCallback(() => {
    setState((s) => {
      if (s.phase !== 'graded') return s
      const nextIndex = s.index + 1
      if (nextIndex >= LEVEL_TEST_SIZE) {
        return { ...s, phase: 'done', passed: gradeLevelTest(s.correctCount), attempt: null }
      }
      return {
        ...s,
        problem: generateForLevel(target, rng),
        index: nextIndex,
        phase: 'answering',
        guessed: null,
        attempt: null,
      }
    })
  }, [rng, target])

  return {
    problem: state.problem,
    index: state.index,
    correctCount: state.correctCount,
    phase: state.phase,
    guessed: state.guessed,
    passed: state.passed,
    total: LEVEL_TEST_SIZE,
    answer,
    next,
  }
}
