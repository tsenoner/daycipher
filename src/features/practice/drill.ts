import { weekdayOfYMD, explain, mod7, type Weekday } from '../../engine'
import type { Attempt } from '../../db/db'
import { ymdKey } from '../../lib/datekey'

export interface Problem {
  year: number
  month: number
  day: number
}

export function gradeProblem(
  p: Problem,
  guessed: Weekday,
  durationMs: number,
  mode: string,
  timestamp: number = Date.now(),
): Attempt {
  const correctWeekday = weekdayOfYMD(p.year, p.month, p.day)
  const targetDate = ymdKey(p.year, p.month, p.day)
  return {
    timestamp,
    targetDate,
    correctWeekday,
    guessedWeekday: guessed,
    correct: correctWeekday === guessed,
    durationMs,
    mode,
    anchorCorrect: null,
    yearDoomCorrect: null,
    offsetCorrect: null,
    timed: false,
  }
}

export interface GuidedAnswers {
  century: Weekday
  yearDoom: Weekday
  final: Weekday
}

export function gradeGuided(
  p: Problem,
  g: GuidedAnswers,
  durationMs: number,
  timestamp: number = Date.now(),
): Attempt {
  const t = explain(p.year, p.month, p.day)
  const targetDate = ymdKey(p.year, p.month, p.day)
  return {
    timestamp,
    targetDate,
    correctWeekday: t.result,
    guessedWeekday: g.final,
    correct: g.final === t.result,
    durationMs,
    mode: 'guided',
    anchorCorrect: g.century === t.centuryAnchor ? 1 : 0,
    yearDoomCorrect: g.yearDoom === t.yearDoomsday ? 1 : 0,
    offsetCorrect: mod7(g.final - g.yearDoom) === mod7(t.result - t.yearDoomsday) ? 1 : 0,
    timed: false,
  }
}

/**
 * Grade a bare-number answer (the number stages `mod7` and `months`). The "weekday" fields
 * carry the actual number drawn (a weekday 0..6 or a day-of-month 3..29); the row
 * is isolated from weekday-named UI by its `learn:*` mode prefix, never by nulling
 * fields (the `Attempt` type forbids null here). `targetDate` is '' — no real date.
 */
export function gradeNumber(
  expected: number,
  guessed: number,
  mode: string,
  durationMs: number,
  timestamp: number = Date.now(),
): Attempt {
  return {
    timestamp,
    targetDate: '',
    correctWeekday: expected,
    guessedWeekday: guessed,
    correct: expected === guessed,
    durationMs,
    mode,
    anchorCorrect: null,
    yearDoomCorrect: null,
    offsetCorrect: null,
    timed: false,
  }
}

/**
 * Grade a raw weekday answer (the `century` stage via the 'anchor' dimension). The
 * optional `dimension` mirrors the graded weekday into `anchorCorrect`/`yearDoomCorrect`
 * for parity with `gradeGuided`. `targetDate` is '' — no real date is being solved.
 */
export function gradeWeekday(
  expected: Weekday,
  guessed: Weekday,
  mode: string,
  durationMs: number,
  timestamp: number = Date.now(),
  dimension?: 'anchor' | 'yearDoom',
): Attempt {
  const correct = expected === guessed
  return {
    timestamp,
    targetDate: '',
    correctWeekday: expected,
    guessedWeekday: guessed,
    correct,
    durationMs,
    mode,
    anchorCorrect: dimension === 'anchor' ? (correct ? 1 : 0) : null,
    yearDoomCorrect: dimension === 'yearDoom' ? (correct ? 1 : 0) : null,
    offsetCorrect: null,
    timed: false,
  }
}
