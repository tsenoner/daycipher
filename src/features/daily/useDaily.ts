import { useCallback, useEffect, useRef, useState } from 'react'
import { type Weekday } from '../../engine'
import { dailyDates } from './daily'
import { gradeProblem, type Problem } from '../practice/drill'
import { addAttempt } from '../../db/attempts'
import { getMeta, setMeta, recordPracticeDay } from '../../db/meta'
import { localDayKey } from '../../lib/datekey'

export interface DailyResult {
  score: number
  total: number
}
interface Answered {
  p: Problem
  guessed: Weekday
  correct: boolean
}

export function useDaily() {
  const dayKey = localDayKey()
  const [dates] = useState<Problem[]>(() => dailyDates(dayKey))
  const [results, setResults] = useState<Answered[]>([])
  const [prior, setPrior] = useState<DailyResult | null | undefined>(undefined)
  const startRef = useRef(performance.now())

  useEffect(() => {
    let active = true
    void getMeta<DailyResult | null>('daily:' + dayKey, null).then((r) => {
      if (active) setPrior(r)
    })
    return () => {
      active = false
    }
  }, [dayKey])

  const index = results.length
  const finished = index >= dates.length
  const current = finished ? null : dates[index]
  const score = results.filter((r) => r.correct).length

  const answer = useCallback(
    (w: Weekday) => {
      setResults((rs) => {
        if (rs.length >= dates.length) return rs
        const p = dates[rs.length]
        const durationMs = Math.round(performance.now() - startRef.current)
        startRef.current = performance.now()
        const attempt = gradeProblem(p, w, durationMs, 'daily')
        void addAttempt(attempt)
        const next = [...rs, { p, guessed: w, correct: attempt.correct }]
        if (next.length >= dates.length) {
          const result = { score: next.filter((r) => r.correct).length, total: dates.length }
          void setMeta('daily:' + dayKey, result)
          void recordPracticeDay(dayKey)
          setPrior(result)
        }
        return next
      })
    },
    [dates, dayKey],
  )

  return { dayKey, dates, index, current, finished, score, results, prior, answer }
}
