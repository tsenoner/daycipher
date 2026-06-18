import {
  explain,
  daysInMonth,
  pick,
  warpYear,
  CURRENT_YEAR,
  type StepTrace,
  type Weekday,
} from '../../engine'
import { monthName, weekdayName, formatYear } from '../../lib/format'
import type { ExampleCheck } from './curriculum'

export const WORKED_STAGES = ['thisyear', 'year', 'full'] as const
export type WorkedStage = (typeof WORKED_STAGES)[number]

export interface GeneratedExample {
  date: string
  steps: string[]
  answer: string
  check: ExampleCheck
}

/** The century-anchor line: recalled for taught centuries, computed for exotic ones. */
function anchorStep(year: number, anchor: Weekday): string {
  const century = Math.floor(year / 100) * 100
  if (century >= 1700 && century <= 2100) {
    return `The ${century}s anchor is ${weekdayName(anchor)}`
  }
  const c = Math.floor(year / 100)
  return `Century anchor: (5 × (${c} mod 4) + 2) mod 7 = ${weekdayName(anchor)}`
}

/** The Odd+11 substeps as display lines. */
function oddElevenSteps(t: StepTrace): string[] {
  const o = t.oddEleven
  return [
    o.start % 2 === 1 ? `T = ${o.start} is odd → +11 = ${o.afterStep1}` : `T = ${o.start} is even`,
    `Halve: ${o.afterStep1} ÷ 2 = ${o.halved}`,
    o.halved % 2 === 1 ? `${o.halved} is odd → +11 = ${o.afterStep3}` : `${o.halved} is even → leave it`,
    `7 − (${o.afterStep3} mod 7) = ${o.finalAdd}`,
  ]
}

/** The "step forward from the month anchor" lines (forward 1..6, casting out sevens). */
function offsetStep(t: StepTrace, day: number): string[] {
  const forward = (((day - t.monthAnchorDay) % 7) + 7) % 7
  return [
    `From the ${t.monthAnchorDay}th, step ${forward} day(s) forward to the ${day}th (cast out sevens)`,
    `${weekdayName(t.monthAnchorWeekday)} + ${forward} → ${weekdayName(t.result)}`,
  ]
}

function datedExample(stage: WorkedStage, year: number, month: number, day: number): GeneratedExample {
  const t = explain(year, month, day)
  const steps =
    stage === 'thisyear'
      ? [
          `${formatYear(year)}'s doomsday = ${weekdayName(t.yearDoomsday)}`,
          `Nearest ${monthName(month)} anchor: the ${t.monthAnchorDay}th = ${weekdayName(t.monthAnchorWeekday)}`,
          ...offsetStep(t, day),
        ]
      : [
          anchorStep(year, t.centuryAnchor),
          ...oddElevenSteps(t),
          `${formatYear(year)} doomsday = ${weekdayName(t.yearDoomsday)}`,
          `${monthName(month)} anchor: the ${t.monthAnchorDay}th = ${weekdayName(t.monthAnchorWeekday)}`,
          ...offsetStep(t, day),
        ]
  return {
    date: `${day} ${monthName(month)} ${formatYear(year)}`,
    steps,
    answer: weekdayName(t.result),
    check: { kind: 'ymd', year, month, day },
  }
}

/** Generate a fresh, illustrative, engine-correct worked example for the stage. */
export function generateWorkedExample(stage: WorkedStage, rng: () => number): GeneratedExample {
  if (stage === 'year') {
    const year = warpYear(rng())
    const t = explain(year, 4, 4) // any anchor date exposes the year doomsday
    const steps: string[] = [
      anchorStep(year, t.centuryAnchor),
      ...oddElevenSteps(t),
      `${weekdayName(t.centuryAnchor)} + ${t.oddEleven.finalAdd} → ${weekdayName(t.yearDoomsday)}`,
    ]
    return {
      date: `Year ${formatYear(year)}`,
      steps,
      answer: `${weekdayName(t.yearDoomsday)} — every doomsday date in ${formatYear(year)} is a ${weekdayName(t.yearDoomsday)}`,
      check: { kind: 'yearDoom', year },
    }
  }
  // thisyear / full: reject a zero offset so "step forward, cast out 7" is visible.
  const baseYear = stage === 'thisyear' ? CURRENT_YEAR : warpYear(rng())
  for (let tries = 0; tries < 25; tries++) {
    const year = stage === 'thisyear' ? baseYear : warpYear(rng())
    const month = pick(rng, 1, 12)
    const day = pick(rng, 1, daysInMonth(year, month))
    if (explain(year, month, day).offset !== 0) return datedExample(stage, year, month, day)
  }
  // Fallback: accept whatever the last draw was.
  const year = stage === 'thisyear' ? baseYear : warpYear(rng())
  const month = pick(rng, 1, 12)
  const day = pick(rng, 1, daysInMonth(year, month))
  return datedExample(stage, year, month, day)
}

