import { useCallback, useEffect, useRef, useState } from 'react'
import { type Weekday } from '../../engine'
import { dailyDates, dailyRange } from './daily'
import { gradeProblem, type Problem } from '../practice/drill'
import type { Attempt } from '../../db/db'
import { recordAttempt } from '../../db/attempts'
import { getMeta, setMeta } from '../../db/meta'
import { getCompleted, getPracticeUnlocked } from '../learn/learnGate'
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
  // Freeze the day for the whole session so the puzzle set and the result key
  // agree even if the user crosses local midnight mid-run. (Streak credit is
  // separate — recordAttempt credits each answer's own day, see below.)
  const [dayKey] = useState(() => localDayKey())
  const [dates, setDates] = useState<Problem[]>(() => dailyDates(dayKey))
  const [results, setResults] = useState<Answered[]>([])
  const [prior, setPrior] = useState<DailyResult | null | undefined>(undefined)
  const startRef = useRef(performance.now())
  const persistedRef = useRef(0) // how many of `results` are already saved in the DB
  const countRef = useRef(dates.length) // fixed number of daily problems, set once
  const rangeRef = useRef<{ minYear: number; maxYear: number } | null>(null) // frozen per day

  // Load any completed result, and resume an in-progress run: a mid-challenge
  // reload restores prior answers instead of re-asking — and re-recording — them.
  useEffect(() => {
    let active = true
    void (async () => {
      const [pr, saved, completed, practiceUnlocked, storedRange] = await Promise.all([
        getMeta<DailyResult | null>('daily:' + dayKey, null),
        getMeta<Weekday[]>('dailyAnswers:' + dayKey, []),
        getCompleted(),
        getPracticeUnlocked(),
        getMeta<{ minYear: number; maxYear: number } | null>('dailyRange:' + dayKey, null),
      ])
      if (!active) return
      // Freeze the year range for the whole day. The first persisted answer locks
      // `storedRange`; a resumed run reads it back and regenerates a byte-identical
      // date set — so saved guesses re-grade against the SAME dates regardless of
      // any unlock that widened the range mid-day. Only a fresh run (no stored
      // range) scopes to the learner's currently-unlocked stages.
      const range = storedRange ?? dailyRange(completed, practiceUnlocked)
      rangeRef.current = range
      const ds = dailyDates(dayKey, countRef.current, range)
      setDates(ds)
      if (pr === null && saved.length > 0) {
        const resumed = saved.slice(0, ds.length).map((g, i) => {
          const attempt = gradeProblem(ds[i], g, 0, 'daily')
          return { p: ds[i], guessed: g, correct: attempt.correct, attempt }
        })
        persistedRef.current = resumed.length // already persisted on a previous visit
        setResults(resumed)
      }
      setPrior(pr)
    })()
    return () => {
      active = false
    }
  }, [dayKey])

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
    // still null) — otherwise that completed run's result would never be saved.
    if (fresh.length === 0 && !(complete && prior === null)) return
    persistedRef.current = results.length
    const result = complete
      ? { score: results.filter((r) => r.correct).length, total: dates.length }
      : null
    if (result) setPrior(result)
    void (async () => {
      // recordAttempt persists each answer and credits the day for correct reps,
      // so a single correct answer keeps the streak alive — no need to finish the set.
      for (const r of fresh) await recordAttempt(r.attempt)
      if (fresh.length > 0) {
        await setMeta(
          'dailyAnswers:' + dayKey,
          results.map((r) => r.guessed),
        )
        // Lock the range at the first persisted answer; resume reads it back so a
        // later unlock can't re-scope (and re-grade) this run against a wider set.
        if (rangeRef.current) await setMeta('dailyRange:' + dayKey, rangeRef.current)
      }
      if (result) await setMeta('daily:' + dayKey, result)
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
