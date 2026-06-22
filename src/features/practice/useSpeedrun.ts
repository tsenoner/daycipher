import { useCallback, useEffect, useRef, useState } from 'react'
import { type Weekday } from '../../engine'
import { nextProblem } from './selector'
import { gradeProblem, type Problem } from './drill'
import type { Attempt } from '../../db/db'
import { listAttempts, recordAttempt } from '../../db/attempts'
import { getMeta, setMeta } from '../../db/meta'
import { useUnlockedLevel } from '../levels/useUnlockedLevel'

const DURATION = 60
type Phase = 'ready' | 'running' | 'over'

export function useSpeedrun() {
  const attemptsRef = useRef<Attempt[]>([])
  const levelRef = useUnlockedLevel()
  const deadlineRef = useRef(0)
  const questionStartRef = useRef(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [problem, setProblem] = useState<Problem | null>(null)
  const [correct, setCorrect] = useState(0)
  const [total, setTotal] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [best, setBest] = useState(0)

  useEffect(() => {
    let active = true
    void listAttempts().then((x) => {
      if (active) attemptsRef.current = x
    })
    void getMeta<number>('speedrunBest', 0).then((b) => {
      if (active) setBest(b)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'running' && timeLeft === 0) {
      setPhase('over')
      setBest((b) => {
        const nb = Math.max(b, correct)
        void setMeta('speedrunBest', nb)
        return nb
      })
    }
  }, [phase, timeLeft, correct])

  const start = useCallback(() => {
    setCorrect(0)
    setTotal(0)
    setTimeLeft(DURATION)
    const now = performance.now()
    deadlineRef.current = now + DURATION * 1000
    questionStartRef.current = now
    setProblem(nextProblem(attemptsRef.current, levelRef.current))
    setPhase('running')
  // levelRef and attemptsRef are stable ref objects — no re-render needed when they update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const answer = useCallback(
    (w: Weekday) => {
      // Reject taps once time is up, even before the phase→'over' render lands.
      if (phase !== 'running' || !problem || performance.now() >= deadlineRef.current) return
      const durationMs = Math.round(performance.now() - questionStartRef.current)
      questionStartRef.current = performance.now()
      const attempt: Attempt = { ...gradeProblem(problem, w, durationMs, 'speedrun'), timed: true }
      void recordAttempt(attempt)
      attemptsRef.current = [attempt, ...attemptsRef.current]
      setTotal((t) => t + 1)
      if (attempt.correct) setCorrect((c) => c + 1)
      setProblem(nextProblem(attemptsRef.current, levelRef.current))
    },
    // levelRef and attemptsRef are stable ref objects — no re-render needed when they update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase, problem],
  )

  return { phase, problem, correct, total, timeLeft, best, start, answer }
}
