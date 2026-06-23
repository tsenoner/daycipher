import { useCallback, useEffect, useState } from 'react'
import { type Weekday } from '../../engine'
import { gradeProblem, type Problem } from './drill'
import type { Attempt } from '../../db/db'
import { recordAttempt } from '../../db/attempts'
import { nextProblem } from './selector'
import { useUnlockedLevel } from '../levels/useUnlockedLevel'
import { useAttemptsRef } from './useAttemptsRef'
import { useFirstProblemAtLevel } from './useFirstProblemAtLevel'

type Phase = 'answering' | 'graded'
interface DrillState {
  problem: Problem
  phase: Phase
  guessed: Weekday | null
  attempt: Attempt | null
}

export function useDrill() {
  const attemptsRef = useAttemptsRef()
  const { ref: levelRef, level, loaded } = useUnlockedLevel()
  const [state, setState] = useState<DrillState>(() => ({
    problem: nextProblem([], levelRef.current),
    phase: 'answering',
    guessed: null,
    attempt: null,
  }))
  const [startedAt, setStartedAt] = useState(() => performance.now())

  // Redraw the lazily-seeded problem #1 at the unlocked level once it resolves (#21),
  // but only while it's still untouched.
  useFirstProblemAtLevel(
    loaded,
    level,
    attemptsRef,
    setState,
    (s) => s.phase === 'answering' && s.guessed === null && s.attempt === null,
  )

  // Persist the graded attempt and feed it to the adaptive selector. Keyed on
  // the attempt so it runs once per answer, and never inside the state updater
  // (which React 18 StrictMode double-invokes).
  useEffect(() => {
    const a = state.attempt
    if (!a) return
    attemptsRef.current = [a, ...attemptsRef.current]
    void recordAttempt(a)
  }, [state.attempt, attemptsRef])

  const answer = useCallback(
    (w: Weekday) => {
      setState((s) => {
        if (s.phase === 'graded') return s
        const durationMs = Math.round(performance.now() - startedAt)
        return {
          ...s,
          phase: 'graded',
          guessed: w,
          attempt: gradeProblem(s.problem, w, durationMs, 'quick'),
        }
      })
    },
    [startedAt],
  )

  const next = useCallback(() => {
    setState({
      problem: nextProblem(attemptsRef.current, levelRef.current),
      phase: 'answering',
      guessed: null,
      attempt: null,
    })
    setStartedAt(performance.now())
    // levelRef and attemptsRef are stable ref objects — no re-render needed when they update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ...state, answer, next }
}
