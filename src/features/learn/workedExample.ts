import {
  explain,
  centuryOf,
  daysInMonth,
  pick,
  warpYear,
  generateDate,
  CURRENT_YEAR,
  type StepTrace,
  type Weekday,
} from '../../engine'
import { monthName, weekdayName, formatYear, formatCentury } from '../../lib/format'
import { RECENT_RANGE } from '../levels/levels'
import type { ExampleCheck } from './curriculum'

export const WORKED_STAGES = ['thisyear', 'year', 'full'] as const
export type WorkedStage = (typeof WORKED_STAGES)[number]

const WORKED_STAGE_SET = new Set<string>(WORKED_STAGES)
/** Type-guard for stages that support a generated "Show another" example. */
export const isWorkedStage = (id: string): id is WorkedStage => WORKED_STAGE_SET.has(id)

export interface GeneratedExample {
  date: string
  steps: string[]
  answer: string
  check: ExampleCheck
}

/** The century-anchor line: recalled for taught centuries, computed for exotic ones. */
function anchorStep(year: number, anchor: Weekday): string {
  const century = centuryOf(year)
  if (century >= 1700 && century <= 2100) {
    return `The ${formatCentury(century)} anchor is ${weekdayName(anchor)}`
  }
  const c = century / 100 // = Math.floor(year / 100)
  // Show the normalized residue so the arithmetic holds for BC years (negative c, where a
  // raw "c mod 4" would read negative and not reproduce the stated anchor).
  const q = ((c % 4) + 4) % 4
  return `Century anchor: 5 × (${c} mod 4 = ${q}) + 2 → ${weekdayName(anchor)}`
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

/** The "step from the month anchor to the target day" lines (cast out sevens to a 0..6 step). */
function offsetStep(t: StepTrace, day: number): string[] {
  const forward = (((day - t.monthAnchorDay) % 7) + 7) % 7
  const gap = day - t.monthAnchorDay
  const rel = gap >= 0 ? `${gap} day(s) after` : `${-gap} day(s) before`
  return [
    `The ${day}th is ${rel} the ${t.monthAnchorDay}th — cast out sevens to a +${forward} step`,
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
  // thisyear / full: prefer a non-zero offset so "step from the anchor, cast out 7" is visible.
  // `full` stays within RECENT_RANGE to match the capstone's clamped problems (no BC examples).
  const draw = () => (stage === 'thisyear' ? dateInYear(CURRENT_YEAR, rng) : generateDate(RECENT_RANGE, rng))
  for (let tries = 0; tries < 25; tries++) {
    const d = draw()
    if (explain(d.year, d.month, d.day).offset !== 0) return datedExample(stage, d.year, d.month, d.day)
  }
  const d = draw() // fallback: accept whatever the last draw is
  return datedExample(stage, d.year, d.month, d.day)
}

/** A uniform month/day within a fixed year (the `thisyear` worked-example draw). */
function dateInYear(year: number, rng: () => number): { year: number; month: number; day: number } {
  const month = pick(rng, 1, 12)
  return { year, month, day: pick(rng, 1, daysInMonth(year, month)) }
}

