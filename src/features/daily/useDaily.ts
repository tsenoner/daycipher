import { useCallback, useEffect, useRef, useState } from 'react'
import { type Weekday } from '../../engine'
import { dailyDates } from './daily'
import { gradeProblem, type Problem } from '../practice/drill'
import type { Attempt } from '../../db/db'
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
  attempt: Attempt
}

export function useDaily() {
  // Freeze the day for the whole session so the puzzle set, the result key, and
  // the streak credit all agree even if the user crosses local midnight mid-run.
  const [dayKey] = useState(() => localDayKey())
  const [dates] = useState<Problem[]>(() => dailyDates(dayKey))
  const [results, setResults] = useState<Answered[]>([])
  const [prior, setPrior] = useState<DailyResult | null | undefined>(undefined)
  const startRef = useRef(performance.now())
  const persistedRef = useRef(false)

  useEffect(() => {
    let active = true
    void getMeta<DailyResult | null>('daily:' + dayKey, null).then((r) => {
      if (active) setPrior(r)
    })
    return () => {
      active = false
    }
  }, [dayKey])

  // Persist only once the full set is done — so a mid-run reload (which resets
  // results) never leaves half-recorded attempts to be re-counted later.
  useEffect(() => {
    if (results.length < dates.length || results.length === 0 || persistedRef.current) return
    persistedRef.current = true
    const result = { score: results.filter((r) => r.correct).length, total: dates.length }
    setPrior(result)
    void (async () => {
      for (const r of results) await addAttempt(r.attempt)
      await setMeta('daily:' + dayKey, result)
      await recordPracticeDay(dayKey)
    })()
  }, [results, dates.length, dayKey])

  const index = results.length
  const finished = index >= dates.length
  const current = finished ? null : dates[index]
  const score = results.filter((r) => r.correct).length

  const answer = useCallback(
    (w: Weekday) => {
      const now = performance.now()
      const durationMs = Math.round(now - startRef.current)
      startRef.current = now
      setResults((rs) => {
        if (rs.length >= dates.length) return rs
        const p = dates[rs.length]
        const attempt = gradeProblem(p, w, durationMs, 'daily')
        return [...rs, { p, guessed: w, correct: attempt.correct, attempt }]
      })
    },
    [dates],
  )

  return { dayKey, dates, index, current, finished, score, results, prior, answer }
}
