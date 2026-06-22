import {
  centuryAnchor,
  daysInMonth,
  generateDate,
  isLeapYear,
  makeRng,
  mod7,
  monthAnchor,
  pick,
  thisYearDoomsday,
  warpYear,
  weekdayOfYMD,
  yearDoomsdayOddEleven,
  CURRENT_YEAR,
  type Weekday,
} from '../../engine'
import { RECENT_RANGE } from '../levels/levels'
import { gradeNumber, gradeProblem, gradeWeekday } from '../practice/drill'
import type { Attempt } from '../../db/db'
import { formatYear, monthName, weekdayName } from '../../lib/format'

/** Fisher–Yates shuffle of a copy, driven by `rng`. */
function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Deal `domain` without replacement as a pure fn of (runSeed, index): every item
 *  appears once per cycle of length `domain.length` before any repeats. */
export function coveringPick<T>(domain: readonly T[], runSeed: number, index: number): T {
  const n = domain.length
  const cycle = Math.floor(index / n)
  const pos = ((index % n) + n) % n
  return shuffle(domain, makeRng((runSeed + cycle * 0x9e3779b1) >>> 0))[pos]
}

type LeapClass = 'div4not100' | 'div100not400' | 'div400' | 'notdiv4'
const LEAP_CLASSES: readonly LeapClass[] = ['div4not100', 'div100not400', 'div400', 'notdiv4']
const LEAP_PRED: Record<LeapClass, (y: number) => boolean> = {
  div4not100: (y) => y % 4 === 0 && y % 100 !== 0,
  div100not400: (y) => y % 100 === 0 && y % 400 !== 0,
  div400: (y) => y % 400 === 0,
  notdiv4: (y) => y % 4 !== 0,
}

/** A year of the given leap class, near the wide centered distribution. */
function leapClassYear(klass: LeapClass, rng: () => number): number {
  const base = warpYear(rng())
  const pred = LEAP_PRED[klass]
  for (let d = 0; d <= 800; d++) {
    if (base + d <= 9999 && pred(base + d)) return base + d
    if (base - d >= -9998 && pred(base - d)) return base - d
  }
  return klass === 'div400' ? 2000 : klass === 'div100not400' ? 1900 : klass === 'div4not100' ? 2024 : 2025
}

/** NumberPad option set for the `months` stage — the doomsday day-of-month answers. */
export const ANCHOR_DAYS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 28, 29]

/** Drives both the answer widget and the feedback formatter; one source for the union. */
export type AnswerKind = 'number' | 'weekday' | 'boolean'

/**
 * One generated lesson instance for a stage. Carries everything the drill UI needs
 * to render (`prompt`, `answerKind`, `options`) and everything `gradeLesson` needs
 * to grade (`correct`, plus `mode`/`date`/`dimension`). Forward-only — no
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
  /** A real date to grade through `gradeProblem` (`thisyear`, `full`); else null. */
  date: { year: number; month: number; day: number } | null
  /** Mirrors the graded weekday into anchorCorrect/yearDoomCorrect (`century`, `year`). */
  dimension?: 'anchor' | 'yearDoom'
}

const TAUGHT_CENTURIES: readonly number[] = [1700, 1800, 1900, 2000, 2100]

/** Nearest leap year to `base` within the supported range (for the full-stage Jan/Feb trap). */
function nearestLeapYear(base: number): number {
  for (let d = 0; d <= 8; d++) {
    if (base + d <= 9999 && isLeapYear(base + d)) return base + d
    if (base - d >= -9998 && isLeapYear(base - d)) return base - d
  }
  return 2000
}

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
        }
      }
      const a = pick(rng, 2, 9)
      const b = pick(rng, 2, 9)
      return {
        stageId,
        mode,
        prompt: `${a} + ${b} (mod 7) = ?`,
        answerKind: 'number',
        options: [0, 1, 2, 3, 4, 5, 6],
        correct: mod7(a + b),
        date: null,
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
      }
    }
    case 'leap': {
      const klass = coveringPick(LEAP_CLASSES, ctx.runSeed ?? 0, ctx.index ?? 0)
      const year = leapClassYear(klass, rng)
      return {
        stageId,
        mode,
        prompt: `Is ${formatYear(year)} a leap year?`,
        answerKind: 'boolean',
        correct: isLeapYear(year) ? 1 : 0,
        date: null,
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
      }
    }
    case 'century': {
      const year = coveringPick(TAUGHT_CENTURIES, ctx.runSeed ?? 0, ctx.index ?? 0)
      return {
        stageId,
        mode,
        prompt: `The ${year}s — century anchor weekday?`,
        answerKind: 'weekday',
        correct: centuryAnchor(year),
        date: null,
        dimension: 'anchor',
      }
    }
    case 'year': {
      const year = warpYear(rng())
      return {
        stageId,
        mode,
        prompt: `Doomsday of ${formatYear(year)}?`,
        answerKind: 'weekday',
        correct: yearDoomsdayOddEleven(year),
        date: null,
        dimension: 'yearDoom',
      }
    }
    case 'full': {
      // Learn stays at the base teaching range RECENT_RANGE (range expansion lives in
      // Levels/Practice, not the curriculum) — ~20% leap Jan/Feb dates (the trap),
      // else a uniform base-range date.
      const { minYear, maxYear } = RECENT_RANGE
      let year: number
      let month: number
      if (rng() < 0.2) {
        year = nearestLeapYear(pick(rng, minYear, maxYear))
        month = pick(rng, 1, 2)
      } else {
        year = pick(rng, minYear, maxYear)
        month = pick(rng, 1, 12)
      }
      const day = pick(rng, 1, daysInMonth(year, month))
      return {
        stageId,
        mode,
        prompt: `${day} ${monthName(month)} ${formatYear(year)} — weekday?`,
        answerKind: 'weekday',
        correct: weekdayOfYMD(year, month, day),
        date: { year, month, day },
      }
    }
    default:
      throw new RangeError(`unknown lesson stage: ${stageId}`)
  }
}

/**
 * Grade a guessed answer for `p` into a real `Attempt` row, dispatching to the
 * right grader per stage (§4). Number/boolean stages (`mod7`, `leap`, `months`) grade a
 * bare value; `thisyear`/`full` grade a real date; `century`/`year` grade a weekday
 * with its dimension. Every stage is accuracy-only — no row is marked timed.
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
    return gradeProblem(p.date, guess as Weekday, durationMs, p.mode, timestamp)
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
