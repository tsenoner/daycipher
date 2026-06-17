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
