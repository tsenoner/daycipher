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

/**
 * Human label for a century block keyed by its astronomical start year:
 * 1900 -> "1900s", 0 -> "1–99 AD" (the block spans 1 BC plus 1–99 AD, overwhelmingly AD),
 * -100 -> "101 BC" (via the era formatter).
 */
export const formatCentury = (century: number): string =>
  century > 0 ? `${century}s` : century === 0 ? '1–99 AD' : formatYear(century)

export function formatDate(year: number, month: number, day: number): string {
  return `${day} ${MONTHS[month - 1]} ${formatYear(year)}`
}

export const weekdayName = (w: Weekday): string => WEEKDAY_NAMES[w]
export const weekdayShort = (w: Weekday): string => WEEKDAY_NAMES[w].slice(0, 3)

export const monthName = (m: number): string => MONTHS[m - 1]

/** English ordinal for a day-of-month: 1 → "1st", 3 → "3rd", 11 → "11th", 22 → "22nd". */
export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'
  return `${n}${suffix}`
}

/** Label for a boolean (yes/no) drill answer: 0 → "No", 1 → "Yes". */
export const booleanLabel = (v: 0 | 1): string => (v === 1 ? 'Yes' : 'No')

/** Weekday values in display order. weekStart 1 = Monday-first, 0 = Sunday-first. */
export function orderedWeekdays(weekStart: 0 | 1): Weekday[] {
  return weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
}
