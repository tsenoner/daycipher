import { useCallback, useEffect, useState } from 'react'
import { type Weekday } from '../../engine'
import { nextProblem } from './selector'
import { gradeGuided, type Problem, type GuidedAnswers } from './drill'
import type { Attempt } from '../../db/db'
import { recordAttempt } from '../../db/attempts'
import { useUnlockedLevel } from '../levels/useUnlockedLevel'
import { useAttemptsRef } from './useAttemptsRef'
import { useFirstProblemAtLevel } from './useFirstProblemAtLevel'

type Step = 0 | 1 | 2 | 3
interface GuidedState {
  problem: Problem
  step: Step
  picks: Partial<GuidedAnswers>
  attempt: Attempt | null
}

export function useGuided() {
  const attemptsRef = useAttemptsRef()
  const { ref: levelRef, level, loaded } = useUnlockedLevel()
  const [state, setState] = useState<GuidedState>(() => ({
    problem: nextProblem([], levelRef.current),
    step: 0,
    picks: {},
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
    (s) => s.step === 0 && Object.keys(s.picks).length === 0 && s.attempt === null,
  )

  // Persist the graded attempt and feed it to the adaptive selector. Keyed on
  // the attempt so it runs once per solve, and never inside the state updater
  // (which React 18 StrictMode double-invokes).
  useEffect(() => {
    const a = state.attempt
    if (!a) return
    attemptsRef.current = [a, ...attemptsRef.current]
    void recordAttempt(a)
  }, [state.attempt, attemptsRef])

  const pick = useCallback(
    (w: Weekday) => {
      setState((s) => {
        if (s.step === 0) return { ...s, step: 1, picks: { ...s.picks, century: w } }
        if (s.step === 1) return { ...s, step: 2, picks: { ...s.picks, yearDoom: w } }
        if (s.step === 2) {
          const picks = { ...s.picks, final: w } as GuidedAnswers
          const durationMs = Math.round(performance.now() - startedAt)
          return { ...s, step: 3, picks, attempt: gradeGuided(s.problem, picks, durationMs) }
        }
        return s
      })
    },
    [startedAt],
  )

  const next = useCallback(() => {
    setState({
      problem: nextProblem(attemptsRef.current, levelRef.current),
      step: 0,
      picks: {},
      attempt: null,
    })
    setStartedAt(performance.now())
    // levelRef and attemptsRef are stable ref objects — no re-render needed when they update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ...state, pick, next }
}
