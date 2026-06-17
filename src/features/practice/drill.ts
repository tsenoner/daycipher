import { weekdayOfYMD, explain, type Weekday } from '../../engine'
import type { Attempt } from '../../db/db'

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
  const targetDate = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
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

const m7 = (n: number) => ((n % 7) + 7) % 7

export function gradeGuided(
  p: Problem,
  g: GuidedAnswers,
  durationMs: number,
  timestamp: number = Date.now(),
): Attempt {
  const t = explain(p.year, p.month, p.day)
  const targetDate = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
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
    offsetCorrect: m7(g.final - g.yearDoom) === m7(t.result - t.yearDoomsday) ? 1 : 0,
    timed: false,
  }
}
