import { weekdayOfYMD, type Weekday } from '../../engine'
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
