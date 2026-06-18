import { WEEKDAY_NAMES, type Weekday } from '../engine'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** Human label for an astronomical year: y <= 0 -> "<1-y> BC", else the plain year. */
export const formatYear = (year: number): string => (year <= 0 ? `${1 - year} BC` : String(year))

export function formatDate(year: number, month: number, day: number): string {
  return `${day} ${MONTHS[month - 1]} ${formatYear(year)}`
}

export const weekdayName = (w: Weekday): string => WEEKDAY_NAMES[w]
export const weekdayShort = (w: Weekday): string => WEEKDAY_NAMES[w].slice(0, 3)

export const monthName = (m: number): string => MONTHS[m - 1]

/** Label for a boolean (yes/no) drill answer: 0 → "No", 1 → "Yes". */
export const booleanLabel = (v: 0 | 1): string => (v === 1 ? 'Yes' : 'No')

/** Weekday values in display order. weekStart 1 = Monday-first, 0 = Sunday-first. */
export function orderedWeekdays(weekStart: 0 | 1): Weekday[] {
  return weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
}
