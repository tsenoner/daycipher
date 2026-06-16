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

export function formatDate(year: number, month: number, day: number): string {
  return `${day} ${MONTHS[month - 1]} ${year}`
}

export const weekdayName = (w: Weekday): string => WEEKDAY_NAMES[w]
export const weekdayShort = (w: Weekday): string => WEEKDAY_NAMES[w].slice(0, 3)

/** Weekday values in display order. weekStart 1 = Monday-first, 0 = Sunday-first. */
export function orderedWeekdays(weekStart: 0 | 1): Weekday[] {
  return weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
}
