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
import { monthName, weekdayName } from '../../lib/format'
import { getStage } from './curriculum'

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

export interface LessonCtx {
  /** Per-mount served-problem index (0-based); used by without-replacement stages. */
  index?: number
  /** Stable per-run seed; used by without-replacement stages. */
  runSeed?: number
}

/**
 * Deterministically draw one instance for `stageId` from `rng` (§4). Pure — no DB,
 * no wall-clock; every stage answers with a single number or weekday.
 */
export function nextLessonProblem(
  stageId: string,
  rng: () => number,
  ctx: LessonCtx = {},
): LessonProblem {
  void ctx // unused until leap/century adopt without-replacement (Tasks 6–7)
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
