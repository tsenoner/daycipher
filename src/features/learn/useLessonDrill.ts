import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  centuryAnchor,
  daysInMonth,
  generateDate,
  isLeapYear,
  mod7,
  monthAnchor,
  pick,
  pickFrom,
  thisYearDoomsday,
  weekdayOfYMD,
  yearDoomsdayOddEleven,
  CURRENT_YEAR,
  type Weekday,
} from '../../engine'
import { gradeNumber, gradeProblem, gradeWeekday } from '../practice/drill'
import type { Attempt } from '../../db/db'
import { addAttempt, listAttempts, recordAttempt } from '../../db/attempts'
import { monthName, weekdayName } from '../../lib/format'
import { perStageOutcome, ruleFor, stageOutcomes, stageProgress } from './learnMastery'
import { getStage } from './curriculum'
import { getCompleted, markStageComplete } from './learnGate'

/** NumberPad option set for the `months` stage — the doomsday day-of-month answers. */
export const ANCHOR_DAYS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 28, 29]

/** Drives both the answer widget and the feedback formatter; one source for the union. */
export type AnswerKind = 'number' | 'weekday' | 'boolean'

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
  /** Drives the answer widget: NumberPad (number) · WeekdayPicker (weekday) · BooleanPicker (boolean). */
  answerKind: AnswerKind
  /** Explicit NumberPad options (the number stages `mod7` & `months`); undefined otherwise. */
  options?: number[]
  /** The known-correct answer value (a weekday 0..6, or a day-of-month). */
  correct: number
  /** A real date to grade through `gradeProblem` (`thisyear`, `full`, `speed`); else null. */
  date: { year: number; month: number; day: number } | null
  /** Mirrors the graded weekday into anchorCorrect/yearDoomCorrect (`century`, `year`). */
  dimension?: 'anchor' | 'yearDoom'
  /** The timed `speed` stage folds `durationMs <= SPEED_MS` into its outcome. */
  timed: boolean
}

// Weight the three centuries a learner actually meets higher (§4, `century` stage).
const CENTURY_WEIGHTS = [1700, 1800, 1800, 1900, 1900, 1900, 2000, 2000, 2000, 2100]

/**
 * Deterministically draw one instance for `stageId` from `rng` (§4). Pure — no DB,
 * no wall-clock; every stage answers with a single number or weekday.
 */
export function nextLessonProblem(stageId: string, rng: () => number): LessonProblem {
  const mode = `learn:${stageId}`
  const timed = getStage(stageId)?.timed ?? false
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
          timed,
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
        timed,
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
        timed,
      }
    }
    case 'leap': {
      const year = leapDrillYear(rng)
      return {
        stageId,
        mode,
        prompt: `Is ${year} a leap year?`,
        answerKind: 'boolean',
        correct: isLeapYear(year) ? 1 : 0,
        date: null,
        timed,
      }
    }
    case 'thisyear': {
      const d = generateDate({ minYear: CURRENT_YEAR, maxYear: CURRENT_YEAR }, rng)
      return {
        stageId,
        mode,
        prompt: `${d.day} ${monthName(d.month)} ${CURRENT_YEAR} — weekday?`,
        sub: `this year's doomsday is ${weekdayName(thisYearDoomsday())}`,
        answerKind: 'weekday',
        correct: weekdayOfYMD(d.year, d.month, d.day),
        date: d,
        timed,
      }
    }
    case 'century': {
      const year = pickFrom(rng, CENTURY_WEIGHTS)
      return {
        stageId,
        mode,
        prompt: `The ${year}s — century anchor weekday?`,
        answerKind: 'weekday',
        correct: centuryAnchor(year),
        date: null,
        dimension: 'anchor',
        timed,
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
        timed,
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
        timed,
      }
    }
    default:
      throw new RangeError(`unknown lesson stage: ${stageId}`)
  }
}

/** A leap-year January/February date — the recurring trap drilled in the `full` stage (§4). */
function leapJanFebDate(rng: () => number): { year: number; month: number; day: number } {
  // Leap years in 1900–2099 are exactly the multiples of 4 (1900 is not a leap year).
  const year = 1904 + 4 * pick(rng, 0, 48)
  const month = pick(rng, 1, 2)
  const day = pick(rng, 1, daysInMonth(year, month))
  return { year, month, day }
}

// Years that exercise the ÷100 / ÷400 rules, mixed with ordinary years, so a
// guesser who ignores the century rule fails the leap stage (§ leap).
const LEAP_DRILL_YEARS = [
  1600, 1700, 1800, 1900, 2000, 2100, 2200, 2400, // century edge cases
  2024, 2020, 1996, 2008, 2025, 2023, 2026, 1997, // ordinary: some ÷4, some not
]

function leapDrillYear(rng: () => number): number {
  return pickFrom(rng, LEAP_DRILL_YEARS)
}

/**
 * Grade a guessed answer for `p` into a real `Attempt` row, dispatching to the
 * right grader per stage (§4). Number/boolean stages (`mod7`, `leap`, `months`) grade a
 * bare value; `thisyear`/`full`/`speed` grade a real date; `century`/`year` grade a weekday
 * with its dimension; the timed `speed` stage additionally marks the row timed.
 */
export function gradeLesson(
  p: LessonProblem,
  guess: number,
  durationMs: number,
  timestamp: number = Date.now(),
): Attempt {
  if (p.answerKind === 'number' || p.answerKind === 'boolean') {
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
  /** Practice-again: fresh in-session window, never latches completion, logs `:practice` rows. */
  practice?: boolean
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

  // Load prior rows once so progress resumes a reload from the log, never restarts
  // it. A remount re-reads the same rows — it does not re-record them.
  useEffect(() => {
    let active = true
    void (async () => {
      if (practice) {
        // Practice-again: never resume prior outcomes, never latch. The window is
        // session-only, so `done` starts false and the drill keeps serving problems.
        if (!active) return
        latchedRef.current = false
        setPriorOutcomes([])
        setProblem(nextLessonProblem(stageId, rngRef.current))
        startRef.current = performance.now()
        return
      }
      const [all, completed] = await Promise.all([listAttempts(), getCompleted()])
      if (!active) return
      const outcomes = stageOutcomes(all, stageId)
      const done = stageProgress(outcomes, rule).done
      latchedRef.current = done
      setPriorOutcomes(outcomes)
      setProblem(nextLessonProblem(stageId, rngRef.current))
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
  }, [stageId, rule, practice])

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
