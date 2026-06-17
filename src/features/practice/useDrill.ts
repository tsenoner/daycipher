import { useCallback, useEffect, useRef, useState } from 'react'
import { type Weekday } from '../../engine'
import { gradeProblem, type Problem } from './drill'
import type { Attempt } from '../../db/db'
import { listAttempts, recordAttempt } from '../../db/attempts'
import { nextProblem } from './selector'

type Phase = 'answering' | 'graded'
interface DrillState {
  problem: Problem
  phase: Phase
  guessed: Weekday | null
  attempt: Attempt | null
}

export function useDrill() {
  const attemptsRef = useRef<Attempt[]>([])
  const [state, setState] = useState<DrillState>(() => ({
    problem: nextProblem([]),
    phase: 'answering',
    guessed: null,
    attempt: null,
  }))
  const [startedAt, setStartedAt] = useState(() => performance.now())

  useEffect(() => {
    let active = true
    void listAttempts().then((a) => {
      if (active) attemptsRef.current = a
    })
    return () => {
      active = false
    }
  }, [])

  // Persist the graded attempt and feed it to the adaptive selector. Keyed on
  // the attempt so it runs once per answer, and never inside the state updater
  // (which React 18 StrictMode double-invokes).
  useEffect(() => {
    const a = state.attempt
    if (!a) return
    attemptsRef.current = [a, ...attemptsRef.current]
    void recordAttempt(a)
  }, [state.attempt])

  const answer = useCallback(
    (w: Weekday) => {
      setState((s) => {
        if (s.phase === 'graded') return s
        const durationMs = Math.round(performance.now() - startedAt)
        return { ...s, phase: 'graded', guessed: w, attempt: gradeProblem(s.problem, w, durationMs, 'quick') }
      })
    },
    [startedAt],
  )

  const next = useCallback(() => {
    setState({ problem: nextProblem(attemptsRef.current), phase: 'answering', guessed: null, attempt: null })
    setStartedAt(performance.now())
  }, [])

  return { ...state, answer, next }
}
