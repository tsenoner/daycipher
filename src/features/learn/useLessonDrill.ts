import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Attempt } from '../../db/db'
import { addAttempt, listAttempts, recordAttempt } from '../../db/attempts'
import { perStageOutcome, ruleFor, stageOutcomes, stageProgress } from './learnMastery'
import { getCompleted, markStageComplete } from './learnGate'
import { nextLessonProblem, gradeLesson, type LessonProblem, type AnswerKind } from './lessonGen'

interface Answered {
  problem: LessonProblem
  attempt: Attempt
}

export interface LessonDrillOptions {
  /** Deterministic RNG for the instance stream (default `Math.random`). */
  rng?: () => number
  /** Inject the answer duration (default: wall-clock); used to drive stage-7 timing in tests. */
  durationMs?: number
  /** Practice-again: fresh in-session window, never latches completion, logs `:practice` rows. */
  practice?: boolean
  /** Stable per-run seed for without-replacement stages (default: random). */
  runSeed?: number
}

/**
 * Drives one stage's post-lesson drill (R5/R6). Mirrors `useDaily`'s persistence
 * discipline — answers land in `results` (pure updater), a separate effect persists
 * each NEW row OUTSIDE the updater tracking how many are already written (`persistedRef`),
 * and the cursor (`problem`) advances before the await. So StrictMode's double-invoke
 * can never double-write a `learn:` row or double-credit the streak. Mastery is
 * recomputed from the prior log plus `results` on demand; a double-apply can't corrupt it.
 */
export function useLessonDrill(stageId: string, opts: LessonDrillOptions = {}) {
  const { rng = Math.random, durationMs, practice = false } = opts
  // The stage is fixed for a mounted drill; hold injected knobs in refs so the
  // answer callback stays identity-stable across renders.
  const rngRef = useRef(rng)
  const durationRef = useRef(durationMs)
  durationRef.current = durationMs
  const runSeedRef = useRef<number>(opts.runSeed ?? Math.floor(Math.random() * 0x7fffffff))
  const servedRef = useRef(0) // per-mount count of problems served (the ctx index source)

  // Prior `learn:<stage>` outcomes (oldest-first), loaded once from the log. The
  // live window is this prefix plus the in-session `results`.
  const [priorOutcomes, setPriorOutcomes] = useState<boolean[] | null>(null)
  const [results, setResults] = useState<Answered[]>([])
  const [problem, setProblem] = useState<LessonProblem | null>(null)
  // Carries the ANSWERED problem's `answerKind` so feedback formats the revealed
  // answer correctly even after the cursor has advanced to a different-kind problem.
  const [feedback, setFeedback] = useState<{
    correct: boolean
    answer: number
    answerKind: AnswerKind
  } | null>(null)
  // Mirror the live problem in a ref so `answer` can grade against it without a
  // stale closure and without nesting a state setter inside another updater.
  const problemRef = useRef<LessonProblem | null>(null)
  problemRef.current = problem
  const startRef = useRef(performance.now())
  const persistedRef = useRef(0) // how many of `results` are already saved in the DB
  const latchedRef = useRef(false) // first DONE transition has been written

  const rule = ruleFor(stageId)

  const serve = useCallback(() => {
    const index = servedRef.current
    servedRef.current = index + 1
    return nextLessonProblem(stageId, rngRef.current, { index, runSeed: runSeedRef.current })
  }, [stageId])

  // Load prior rows once so progress resumes a reload from the log, never restarts
  // it. A remount re-reads the same rows — it does not re-record them.
  useEffect(() => {
    // Reset the served-index at the start of each run so a dev StrictMode double-invoke serves index 0 first (matching prod); covering stages (leap/century) then deal from position 0.
    servedRef.current = 0
    let active = true
    void (async () => {
      if (practice) {
        // Practice-again: never resume prior outcomes, never latch. The window is
        // session-only, so `done` starts false and the drill keeps serving problems.
        if (!active) return
        latchedRef.current = false
        setPriorOutcomes([])
        setProblem(serve())
        startRef.current = performance.now()
        return
      }
      const [all, completed] = await Promise.all([listAttempts(), getCompleted()])
      if (!active) return
      const outcomes = stageOutcomes(all, stageId)
      const done = stageProgress(outcomes, rule).done
      latchedRef.current = done
      setPriorOutcomes(outcomes)
      setProblem(serve())
      // Stage 7 (and any timed stage) times from mount: prime the clock here so the
      // first measurement excludes the async load. Later reps reset it in `answer`.
      startRef.current = performance.now()
      // Self-heal: a stage already DONE in the log but missing from `learnCompleted`
      // (e.g. an effect lost to a crash) re-latches its completion. Idempotent.
      if (done && !completed.includes(stageId)) await markStageComplete(stageId)
    })()
    return () => {
      active = false
    }
  }, [stageId, rule, practice, serve])

  // Memoize so the window only recomputes when its inputs change — `rule` is a
  // stable per-stage object (derived map), so these stay referentially steady.
  const outcomes = useMemo(
    () => [...(priorOutcomes ?? []), ...results.map((r) => perStageOutcome(r.attempt, stageId))],
    [priorOutcomes, results, stageId],
  )
  const progress = useMemo(() => stageProgress(outcomes, rule), [outcomes, rule])

  // Persist each newly answered row immediately, OUTSIDE the state updater, so a
  // StrictMode double-invoked updater can't double-write. Day-credit is gated on
  // correctness (R5); the first DONE transition latches the stage (R6).
  useEffect(() => {
    if (priorOutcomes === null) return // wait until the load settles
    const fresh = results.slice(persistedRef.current)
    if (fresh.length === 0) return
    persistedRef.current = results.length
    const done = progress.done
    void (async () => {
      for (const r of fresh) {
        const row = practice ? { ...r.attempt, mode: `${r.attempt.mode}:practice` } : r.attempt
        if (row.correct) await recordAttempt(row)
        else await addAttempt(row)
      }
      // Practice never completes a stage — only the first DONE transition of a
      // real mastery run latches.
      if (!practice && done && !latchedRef.current) {
        latchedRef.current = true
        await markStageComplete(stageId)
      }
    })()
  }, [results, priorOutcomes, progress.done, stageId, practice])

  const answer = useCallback(
    (value: number, injectedMs?: number) => {
      const p = problemRef.current
      if (!p) return
      const now = performance.now()
      const ms = injectedMs ?? durationRef.current ?? Math.round(now - startRef.current)
      startRef.current = now
      const attempt = gradeLesson(p, value, ms)
      // Append the answer (the effect persists it) and advance the cursor. Both are
      // top-level setters — no nested updater — so StrictMode stays single-write.
      setResults((rs) => [...rs, { problem: p, attempt }])
      setFeedback({ correct: attempt.correct, answer: p.correct, answerKind: p.answerKind })
      setProblem(serve())
    },
    [serve],
  )

  return {
    loaded: priorOutcomes !== null,
    current: problem,
    progress,
    feedback,
    done: progress.done,
    answer,
  }
}

// Preserve the public import surface used by tests and screens.
export { nextLessonProblem, gradeLesson, ANCHOR_DAYS } from './lessonGen'
export type { LessonProblem, AnswerKind, LessonCtx } from './lessonGen'
