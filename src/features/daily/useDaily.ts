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
  const persistedRef = useRef(0) // how many of `results` are already saved in the DB

  // Load any completed result, and resume an in-progress run: a mid-challenge
  // reload restores prior answers instead of re-asking — and re-recording — them.
  useEffect(() => {
    let active = true
    void (async () => {
      const [pr, saved] = await Promise.all([
        getMeta<DailyResult | null>('daily:' + dayKey, null),
        getMeta<Weekday[]>('dailyAnswers:' + dayKey, []),
      ])
      if (!active) return
      if (pr === null && saved.length > 0) {
        const resumed = saved.slice(0, dates.length).map((g, i) => {
          const attempt = gradeProblem(dates[i], g, 0, 'daily')
          return { p: dates[i], guessed: g, correct: attempt.correct, attempt }
        })
        persistedRef.current = resumed.length // already persisted on a previous visit
        setResults(resumed)
      }
      setPrior(pr)
    })()
    return () => {
      active = false
    }
  }, [dayKey, dates])

  const index = results.length
  const finished = index >= dates.length
  const current = finished ? null : dates[index]
  const score = results.filter((r) => r.correct).length

  // Persist each newly answered question immediately (so partial progress still
  // counts), and finalize once the set is complete. Runs outside the state
  // updater so StrictMode's double-invoked updater can't double-write.
  useEffect(() => {
    if (prior === undefined) return // wait until load/resume settles
    const complete = results.length >= dates.length
    const fresh = results.slice(persistedRef.current)
    // Persist when there are new answers, OR when a fully-answered run was
    // resumed before its finalize write landed (fresh is empty but prior is
    // still null) — otherwise that completed day would never be credited.
    if (fresh.length === 0 && !(complete && prior === null)) return
    persistedRef.current = results.length
    const result = complete
      ? { score: results.filter((r) => r.correct).length, total: dates.length }
      : null
    if (result) setPrior(result)
    void (async () => {
      for (const r of fresh) await addAttempt(r.attempt)
      if (fresh.length > 0) {
        await setMeta(
          'dailyAnswers:' + dayKey,
          results.map((r) => r.guessed),
        )
      }
      if (result) {
        await setMeta('daily:' + dayKey, result)
        await recordPracticeDay(dayKey)
      }
    })()
  }, [results, prior, dates, dayKey])

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
