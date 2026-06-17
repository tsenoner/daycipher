import { useCallback, useEffect, useRef, useState } from 'react'
import { type Weekday } from '../../engine'
import { gradeProblem, type Problem } from './drill'
import type { Attempt } from '../../db/db'
import { addAttempt, listAttempts } from '../../db/attempts'
import { recordPracticeDay } from '../../db/meta'
import { localDayKey } from '../../lib/datekey'
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

  const answer = useCallback(
    (w: Weekday) => {
      setState((s) => {
        if (s.phase === 'graded') return s
        const durationMs = Math.round(performance.now() - startedAt)
        const attempt = gradeProblem(s.problem, w, durationMs, 'quick')
        void addAttempt(attempt)
        void recordPracticeDay(localDayKey())
        attemptsRef.current = [attempt, ...attemptsRef.current]
        return { ...s, phase: 'graded', guessed: w, attempt }
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
