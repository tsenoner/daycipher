import { useCallback, useEffect, useRef, useState } from 'react'
import { type Weekday } from '../../engine'
import { gradeProblem, type Problem } from './drill'
import type { Attempt } from '../../db/db'
import { listAttempts, recordAttempt } from '../../db/attempts'
import { nextProblem } from './selector'
import { useUnlockedLevel } from '../levels/useUnlockedLevel'

type Phase = 'answering' | 'graded'
interface DrillState {
  problem: Problem
  phase: Phase
  guessed: Weekday | null
  attempt: Attempt | null
}

export function useDrill() {
  const attemptsRef = useRef<Attempt[]>([])
  const { ref: levelRef, level, loaded } = useUnlockedLevel()
  const [state, setState] = useState<DrillState>(() => ({
    problem: nextProblem([], levelRef.current),
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

  // The lazy seed above drew problem #1 while the unlocked level was still the
  // default 0. Once it resolves, regenerate the first problem at the real level —
  // but only when it differs from the seed (skip 0, so default users see no swap)
  // and only while the first problem is still untouched. Fires at most once.
  const firstRegen = useRef(false)
  useEffect(() => {
    if (!loaded || firstRegen.current) return
    firstRegen.current = true
    if (level === 0) return
    const fresh = nextProblem(attemptsRef.current, level)
    setState((s) =>
      s.phase === 'answering' && s.guessed === null && s.attempt === null ? { ...s, problem: fresh } : s,
    )
  }, [loaded, level])

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
    setState({ problem: nextProblem(attemptsRef.current, levelRef.current), phase: 'answering', guessed: null, attempt: null })
    setStartedAt(performance.now())
  // levelRef and attemptsRef are stable ref objects — no re-render needed when they update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { ...state, answer, next }
}
