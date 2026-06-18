import type { StepTrace, Weekday } from './types'

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export const mod7 = (n: number): Weekday => (((n % 7) + 7) % 7) as Weekday

/** The century a year belongs to, as the year that starts it (e.g. 1986 -> 1900). */
export const centuryOf = (year: number): number => Math.floor(year / 100) * 100

/** Day-of-month of the month's doomsday anchor. month is 1-12. */
export function monthAnchor(month: number, leap: boolean): number {
  switch (month) {
    case 1:
      return leap ? 4 : 3
    case 2:
      return leap ? 29 : 28
    case 3:
      return 14
    case 4:
      return 4
    case 5:
      return 9
    case 6:
      return 6
    case 7:
      return 11
    case 8:
      return 8
    case 9:
      return 5
    case 10:
      return 10
    case 11:
      return 7
    case 12:
      return 12
    default:
      throw new RangeError(`invalid month: ${month}`)
  }
}

/** Century anchor weekday. anchor = (5·(c mod 4) + 2) mod 7, c = floor(year/100), Tuesday(2) base. */
export function centuryAnchor(year: number): Weekday {
  const c = Math.floor(year / 100)
  return mod7(5 * (((c % 4) + 4) % 4) + 2)
}

/** Year's doomsday weekday via the Fong–Walters "Odd+11" method. */
export function yearDoomsdayOddEleven(year: number): Weekday {
  let t = ((year % 100) + 100) % 100
  if (t % 2 === 1) t += 11
  t = t / 2
  if (t % 2 === 1) t += 11
  t = 7 - (t % 7)
  return mod7(centuryAnchor(year) + t)
}

/** Year's doomsday weekday via Conway's classic divide-by-12 method. */
export function yearDoomsdayConway(year: number): Weekday {
  const y = ((year % 100) + 100) % 100
  const a = Math.floor(y / 12)
  const b = y % 12
  const c = Math.floor(b / 4)
  return mod7(centuryAnchor(year) + a + b + c)
}

/** Weekday (Sunday=0) of the given Gregorian Y/M/D. */
export function weekdayOfYMD(year: number, month: number, day: number): Weekday {
  const doomsday = yearDoomsdayOddEleven(year)
  const anchor = monthAnchor(month, isLeapYear(year))
  return mod7(doomsday + (day - anchor))
}

/** Weekday (Sunday=0) of a Date, read in UTC. */
export function weekdayOf(date: Date): Weekday {
  return weekdayOfYMD(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

/** Reduce an integer offset to the range -3..3 (mod 7), for human-friendly counting. */
function reduceOffset(diff: number): number {
  let r = ((diff % 7) + 7) % 7
  if (r > 3) r -= 7
  return r
}

export function explain(year: number, month: number, day: number): StepTrace {
  const leap = isLeapYear(year)
  const cAnchor = centuryAnchor(year)
  const yearDoomsday = yearDoomsdayOddEleven(year)
  const anchorDay = monthAnchor(month, leap)
  const offset = reduceOffset(day - anchorDay)
  const result = mod7(yearDoomsday + offset)

  const start = ((year % 100) + 100) % 100
  const afterStep1 = start % 2 === 1 ? start + 11 : start
  const halved = afterStep1 / 2
  const afterStep3 = halved % 2 === 1 ? halved + 11 : halved
  const finalAdd = 7 - (afterStep3 % 7)

  return {
    year,
    month,
    day,
    leap,
    centuryAnchor: cAnchor,
    yearDoomsday,
    oddEleven: { start, afterStep1, halved, afterStep3, finalAdd },
    monthAnchorDay: anchorDay,
    monthAnchorWeekday: yearDoomsday,
    offset,
    result,
  }
}
