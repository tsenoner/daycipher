import type { Weekday } from './types'

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

const mod7 = (n: number): Weekday => (((n % 7) + 7) % 7) as Weekday

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
  return mod7(5 * (c % 4) + 2)
}
