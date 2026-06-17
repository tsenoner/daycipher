import { useCallback, useEffect, useRef, useState } from 'react'
import { type Weekday } from '../../engine'
import { nextProblem } from './selector'
import { gradeGuided, type Problem, type GuidedAnswers } from './drill'
import type { Attempt } from '../../db/db'
import { addAttempt, listAttempts } from '../../db/attempts'
import { recordPracticeDay } from '../../db/meta'
import { localDayKey } from '../../lib/datekey'

type Step = 0 | 1 | 2 | 3
interface GuidedState {
  problem: Problem
  step: Step
  picks: Partial<GuidedAnswers>
  attempt: Attempt | null
}

export function useGuided() {
  const attemptsRef = useRef<Attempt[]>([])
  const [state, setState] = useState<GuidedState>(() => ({
    problem: nextProblem([]),
    step: 0,
    picks: {},
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

  const pick = useCallback(
    (w: Weekday) => {
      setState((s) => {
        if (s.step === 0) return { ...s, step: 1, picks: { ...s.picks, century: w } }
        if (s.step === 1) return { ...s, step: 2, picks: { ...s.picks, yearDoom: w } }
        if (s.step === 2) {
          const picks = { ...s.picks, final: w } as GuidedAnswers
          const durationMs = Math.round(performance.now() - startedAt)
          const attempt = gradeGuided(s.problem, picks, durationMs)
          void addAttempt(attempt)
          void recordPracticeDay(localDayKey())
          attemptsRef.current = [attempt, ...attemptsRef.current]
          return { ...s, step: 3, picks, attempt }
        }
        return s
      })
    },
    [startedAt],
  )

  const next = useCallback(() => {
    setState({ problem: nextProblem(attemptsRef.current), step: 0, picks: {}, attempt: null })
    setStartedAt(performance.now())
  }, [])

  return { ...state, pick, next }
}
