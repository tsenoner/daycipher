import { useCallback, useState } from 'react'
import { generateDate, type Weekday } from '../../engine'
import { gradeProblem, type Problem } from './drill'
import type { Attempt } from '../../db/db'
import { addAttempt } from '../../db/attempts'
import { recordPracticeDay } from '../../db/meta'
import { localDayKey } from '../../lib/datekey'

type Phase = 'answering' | 'graded'
const RANGE = { minYear: 1900, maxYear: 2099 }

interface DrillState {
  problem: Problem
  phase: Phase
  guessed: Weekday | null
  attempt: Attempt | null
}

export function useDrill() {
  const [state, setState] = useState<DrillState>(() => ({
    problem: generateDate(RANGE),
    phase: 'answering',
    guessed: null,
    attempt: null,
  }))
  const [startedAt, setStartedAt] = useState(() => performance.now())

  const answer = useCallback(
    (w: Weekday) => {
      setState((s) => {
        if (s.phase === 'graded') return s
        const durationMs = Math.round(performance.now() - startedAt)
        const attempt = gradeProblem(s.problem, w, durationMs, 'quick')
        void addAttempt(attempt)
        void recordPracticeDay(localDayKey())
        return { ...s, phase: 'graded', guessed: w, attempt }
      })
    },
    [startedAt],
  )

  const next = useCallback(() => {
    setState({ problem: generateDate(RANGE), phase: 'answering', guessed: null, attempt: null })
    setStartedAt(performance.now())
  }, [])

  return { ...state, answer, next }
}
