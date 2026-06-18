import { useCallback, useEffect, useRef, useState } from 'react'
import {
  centuryAnchor,
  daysInMonth,
  generateDate,
  mod7,
  monthAnchor,
  pick,
  weekdayOfYMD,
  yearDoomsdayOddEleven,
  CURRENT_YEAR,
  type Weekday,
} from '../../engine'
import { gradeNumber, gradeProblem, gradeWeekday } from '../practice/drill'
import type { Attempt } from '../../db/db'
import { addAttempt, listAttempts, recordAttempt } from '../../db/attempts'
import { monthName, weekdayName } from '../../lib/format'
import { perStageOutcome, ruleFor, stageProgress } from './learnMastery'
import { markStageComplete } from './learnGate'

/** NumberPad option set for stage 2 (`months`) — the doomsday day-of-month answers. */
export const ANCHOR_DAYS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 28, 29]

/**
 * One generated lesson instance for a stage. Carries everything the drill UI needs
 * to render (`prompt`, `answerKind`, `options`) and everything `gradeLesson` needs
 * to grade (`correct`, plus `mode`/`date`/`dimension`/`timed`). Forward-only — no
 * reverse items (§4): surface variety comes from the randomized forward generator.
 */
export interface LessonProblem {
  stageId: string
  mode: string // `learn:<stageId>`
  prompt: string
  sub?: string
  /** Drives the answer widget: NumberPad (number) vs WeekdayPicker (weekday). */
  answerKind: 'number' | 'weekday'
  /** Explicit NumberPad options (stages 1–2); undefined for weekday stages. */
  options?: number[]
  /** The known-correct answer value (a weekday 0..6, or a day-of-month). */
  correct: number
  /** A real date to grade through `gradeProblem` (stages 3, 6, 7); else null. */
  date: { year: number; month: number; day: number } | null
  /** Mirrors the graded weekday into anchorCorrect/yearDoomCorrect (stages 4, 5). */
  dimension?: 'anchor' | 'yearDoom'
  /** Stage 7 is timed; its outcome folds `durationMs <= SPEED_MS`. */
  timed: boolean
}

// Weight the three centuries a learner actually meets higher (§4 stage 4).
const CENTURY_WEIGHTS = [1700, 1800, 1800, 1900, 1900, 1900, 2000, 2000, 2000, 2100]

/**
 * Deterministically draw one instance for `stageId` from `rng` (§4). Pure — no DB,
 * no wall-clock; every stage answers with a single number or weekday.
 */
export function nextLessonProblem(stageId: string, rng: () => number): LessonProblem {
  const mode = `learn:${stageId}`
  switch (stageId) {
    case 'mod7': {
      // Either "cast out sevens" on one number, or an addend pair (mod 7).
      if (rng() < 0.5) {
        const n = pick(rng, 15, 69)
        return {
          stageId,
          mode,
          prompt: `Cast out sevens: ${n} → ?`,
          answerKind: 'number',
          options: [0, 1, 2, 3, 4, 5, 6],
          correct: mod7(n),
          date: null,
          timed: false,
        }
      }
      const a = pick(rng, 3, 6)
      const b = pick(rng, 3, 6)
      return {
        stageId,
        mode,
        prompt: `${a} + ${b} (mod 7) = ?`,
        answerKind: 'number',
        options: [0, 1, 2, 3, 4, 5, 6],
        correct: mod7(a + b),
        date: null,
        timed: false,
      }
    }
    case 'months': {
      // Bias toward Jan/Feb (~30%) so the leap-year trap gets drilled.
      const month = rng() < 0.3 ? pick(rng, 1, 2) : pick(rng, 1, 12)
      const leap = rng() < 0.5
      const leapLabel = leap && (month === 1 || month === 2) ? ' (leap year)' : ''
      return {
        stageId,
        mode,
        prompt: `Anchor day for ${monthName(month)}${leapLabel}?`,
        answerKind: 'number',
        options: ANCHOR_DAYS,
        correct: monthAnchor(month, leap),
        date: null,
        timed: false,
      }
    }
    case 'thisyear': {
      const d = generateDate({ minYear: CURRENT_YEAR, maxYear: CURRENT_YEAR }, rng)
      return {
        stageId,
        mode,
        prompt: `${d.day} ${monthName(d.month)} ${CURRENT_YEAR} — weekday?`,
        sub: `this year's doomsday is ${weekdayName(yearDoomsdayOddEleven(CURRENT_YEAR))}`,
        answerKind: 'weekday',
        correct: weekdayOfYMD(d.year, d.month, d.day),
        date: d,
        timed: false,
      }
    }
    case 'century': {
      const year = CENTURY_WEIGHTS[pick(rng, 0, CENTURY_WEIGHTS.length - 1)]
      return {
        stageId,
        mode,
        prompt: `The ${year}s — century anchor weekday?`,
        answerKind: 'weekday',
        correct: centuryAnchor(year),
        date: null,
        dimension: 'anchor',
        timed: false,
      }
    }
    case 'year': {
      const year = pick(rng, 1900, 2099)
      return {
        stageId,
        mode,
        prompt: `Doomsday of ${year}?`,
        answerKind: 'weekday',
        correct: yearDoomsdayOddEleven(year),
        date: null,
        dimension: 'yearDoom',
        timed: false,
      }
    }
    case 'full':
    case 'speed': {
      // ~20% leap Jan/Feb dates for `full` so the leap trap recurs end-to-end.
      const d =
        stageId === 'full' && rng() < 0.2
          ? leapJanFebDate(rng)
          : generateDate({ minYear: 1900, maxYear: 2099 }, rng)
      return {
        stageId,
        mode,
        prompt: `${d.day} ${monthName(d.month)} ${d.year} — weekday?`,
        answerKind: 'weekday',
        correct: weekdayOfYMD(d.year, d.month, d.day),
        date: d,
        timed: stageId === 'speed',
      }
    }
    default:
      throw new RangeError(`unknown lesson stage: ${stageId}`)
  }
}

/** A leap-year January/February date — the recurring trap drilled in stage 6 (§4). */
function leapJanFebDate(rng: () => number): { year: number; month: number; day: number } {
  // Leap years in 1900–2099 are exactly the multiples of 4 (1900 is not a leap year).
  const year = 1904 + 4 * pick(rng, 0, 48)
  const month = pick(rng, 1, 2)
  const day = pick(rng, 1, daysInMonth(year, month))
  return { year, month, day }
}

/**
 * Grade a guessed answer for `p` into a real `Attempt` row, dispatching to the
 * right grader per stage (§4). Stages 1–2 grade a bare number; 3/6/7 grade a real
 * date; 4/5 grade a weekday with its dimension; 7 additionally marks the row timed.
 */
export function gradeLesson(
  p: LessonProblem,
  guess: number,
  durationMs: number,
  timestamp: number = Date.now(),
): Attempt {
  if (p.answerKind === 'number') {
    return gradeNumber(p.correct, guess, p.mode, durationMs, timestamp)
  }
  if (p.date) {
    const a = gradeProblem(p.date, guess as Weekday, durationMs, p.mode, timestamp)
    return p.timed ? { ...a, timed: true } : a
  }
  return gradeWeekday(
    p.correct as Weekday,
    guess as Weekday,
    p.mode,
    durationMs,
    timestamp,
    p.dimension,
  )
}

interface Answered {
  problem: LessonProblem
  attempt: Attempt
}

export interface LessonDrillOptions {
  /** Deterministic RNG for the instance stream (default `Math.random`). */
  rng?: () => number
  /** Inject the answer duration (default: wall-clock); used to drive stage-7 timing in tests. */
  durationMs?: number
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
  const { rng = Math.random, durationMs } = opts
  // The stage is fixed for a mounted drill; hold injected knobs in refs so the
  // answer callback stays identity-stable across renders.
  const rngRef = useRef(rng)
  const durationRef = useRef(durationMs)
  durationRef.current = durationMs

  // Prior `learn:<stage>` outcomes (oldest-first), loaded once from the log. The
  // live window is this prefix plus the in-session `results`.
  const [priorOutcomes, setPriorOutcomes] = useState<boolean[] | null>(null)
  const [results, setResults] = useState<Answered[]>([])
  const [problem, setProblem] = useState<LessonProblem | null>(null)
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: number } | null>(null)
  // Mirror the live problem in a ref so `answer` can grade against it without a
  // stale closure and without nesting a state setter inside another updater.
  const problemRef = useRef<LessonProblem | null>(null)
  problemRef.current = problem
  const startRef = useRef(performance.now())
  const persistedRef = useRef(0) // how many of `results` are already saved in the DB
  const latchedRef = useRef(false) // first DONE transition has been written

  const rule = ruleFor(stageId)

  // Load prior rows once so progress resumes a reload from the log, never restarts
  // it. A remount re-reads the same rows — it does not re-record them.
  useEffect(() => {
    let active = true
    void (async () => {
      const all = await listAttempts()
      if (!active) return
      const outcomes = all
        .filter((a) => a.mode === `learn:${stageId}`)
        .reverse() // oldest-first
        .map((a) => perStageOutcome(a, stageId))
      latchedRef.current = stageProgress(outcomes, rule).done
      setPriorOutcomes(outcomes)
      setProblem(nextLessonProblem(stageId, rngRef.current))
    })()
    return () => {
      active = false
    }
  }, [stageId, rule])

  const outcomes = [
    ...(priorOutcomes ?? []),
    ...results.map((r) => perStageOutcome(r.attempt, stageId)),
  ]
  const progress = stageProgress(outcomes, rule)

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
        if (r.attempt.correct) await recordAttempt(r.attempt)
        else await addAttempt(r.attempt)
      }
      if (done && !latchedRef.current) {
        latchedRef.current = true
        await markStageComplete(stageId)
      }
    })()
  }, [results, priorOutcomes, progress.done, stageId])

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
      setFeedback({ correct: attempt.correct, answer: p.correct })
      setProblem(nextLessonProblem(stageId, rngRef.current))
    },
    [stageId],
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
