import { describe, it, expect } from 'vitest'
import {
  isLeapYear,
  monthAnchor,
  centuryAnchor,
  yearDoomsdayOddEleven,
  yearDoomsdayConway,
  weekdayOfYMD,
  weekdayOf,
} from './doomsday'

describe('isLeapYear', () => {
  it.each([
    [2000, true],
    [1900, false],
    [2024, true],
    [2023, false],
    [1600, true],
    [2100, false],
  ])('year %i -> %s', (y, expected) => expect(isLeapYear(y)).toBe(expected))
})

describe('monthAnchor', () => {
  it('even months self-reference', () => {
    expect(monthAnchor(4, false)).toBe(4)
    expect(monthAnchor(6, false)).toBe(6)
    expect(monthAnchor(8, false)).toBe(8)
    expect(monthAnchor(10, false)).toBe(10)
    expect(monthAnchor(12, false)).toBe(12)
  })
  it('odd months 9-to-5 at the 7-Eleven', () => {
    expect(monthAnchor(5, false)).toBe(9)
    expect(monthAnchor(9, false)).toBe(5)
    expect(monthAnchor(7, false)).toBe(11)
    expect(monthAnchor(11, false)).toBe(7)
  })
  it('Jan/Feb shift in leap years, March = 14', () => {
    expect(monthAnchor(1, false)).toBe(3)
    expect(monthAnchor(1, true)).toBe(4)
    expect(monthAnchor(2, false)).toBe(28)
    expect(monthAnchor(2, true)).toBe(29)
    expect(monthAnchor(3, false)).toBe(14)
  })
})

describe('centuryAnchor (Sunday=0)', () => {
  it.each([
    [1700, 0],
    [1800, 5],
    [1900, 3],
    [2000, 2],
    [2100, 0],
    [1600, 2],
  ])('year %i -> weekday %i', (y, w) => expect(centuryAnchor(y)).toBe(w))
})

describe('year doomsday', () => {
  // Sunday=0; known doomsdays: 2005=Mon(1), 1966=Mon(1), 2000=Tue(2), 1900=Wed(3), 2023=Tue(2)
  it.each([
    [2005, 1],
    [1966, 1],
    [2000, 2],
    [1900, 3],
    [2023, 2],
    [1986, 5],
  ])('Odd+11 %i -> %i', (y, w) => expect(yearDoomsdayOddEleven(y)).toBe(w))
  it.each([
    [2005, 1],
    [1966, 1],
    [2000, 2],
    [1900, 3],
    [2023, 2],
    [1986, 5],
  ])('Conway %i -> %i', (y, w) => expect(yearDoomsdayConway(y)).toBe(w))
  it('both methods agree across 1600-2099', () => {
    for (let y = 1600; y <= 2099; y++) {
      expect(yearDoomsdayOddEleven(y)).toBe(yearDoomsdayConway(y))
    }
  })
})

/** Reference weekday using JS Date in UTC (proleptic Gregorian). Valid for year >= 100. */
function refWeekday(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

describe('weekdayOfYMD', () => {
  it('known dates', () => {
    expect(weekdayOfYMD(1986, 3, 14)).toBe(5) // Friday
    expect(weekdayOfYMD(2000, 2, 2)).toBe(3) // Wednesday (leap-year trap)
    expect(weekdayOfYMD(1776, 7, 4)).toBe(4) // Thursday
    expect(weekdayOfYMD(2026, 6, 16)).toBe(2) // Tuesday
  })
  it('matches the reference for EVERY day 1600-01-01 .. 2099-12-31', () => {
    const daysInMonth = (y: number, m: number) =>
      [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]
    let mismatches = 0
    let firstMismatch = ''
    for (let y = 1600; y <= 2099; y++) {
      for (let m = 1; m <= 12; m++) {
        for (let d = 1; d <= daysInMonth(y, m); d++) {
          if (weekdayOfYMD(y, m, d) !== refWeekday(y, m, d)) {
            mismatches++
            if (!firstMismatch) firstMismatch = `${y}-${m}-${d}`
          }
        }
      }
    }
    expect(`${mismatches} (first: ${firstMismatch})`).toBe('0 (first: )')
  })
})

describe('weekdayOf(Date)', () => {
  it('reads UTC components', () => {
    expect(weekdayOf(new Date(Date.UTC(1986, 2, 14)))).toBe(5)
  })
})
