import { describe, it, expect } from 'vitest'
import {
  isLeapYear,
  monthAnchor,
  centuryAnchor,
  yearDoomsdayOddEleven,
  yearDoomsdayConway,
  weekdayOfYMD,
  weekdayOf,
  explain,
} from './doomsday'
import { makeRng } from './generate'

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

describe('explain', () => {
  it('produces a consistent trace for 14 March 1986', () => {
    const t = explain(1986, 3, 14)
    expect(t.centuryAnchor).toBe(3) // Wed
    expect(t.yearDoomsday).toBe(5) // Fri
    expect(t.monthAnchorDay).toBe(14)
    expect(t.monthAnchorWeekday).toBe(5)
    expect(t.offset).toBe(0)
    expect(t.result).toBe(5)
  })
  it('reduced offset stays within -3..3', () => {
    const t = explain(2000, 2, 2)
    expect(t.result).toBe(3) // Wed
    expect(Math.abs(t.offset)).toBeLessThanOrEqual(3)
  })
  it('trace result always equals weekdayOfYMD across a sample', () => {
    for (let y = 1601; y <= 2099; y += 7) {
      for (const [m, d] of [
        [1, 1],
        [2, 28],
        [7, 4],
        [12, 31],
      ] as const) {
        expect(explain(y, m, d).result).toBe(weekdayOfYMD(y, m, d))
      }
    }
  })
})

/** Independent oracle: proleptic-Gregorian weekday via Julian Day Number, Sunday = 0. */
function refWeekdayJDN(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12)
  const yy = y + 4800 - a
  const mm = m + 12 * a - 3
  const jdn =
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  return (((jdn + 1) % 7) + 7) % 7
}

describe('proleptic Gregorian across the wide range', () => {
  it('weekdayOfYMD matches the JDN reference, including BC years', () => {
    const rng = makeRng(20260618)
    for (let i = 0; i < 2000; i++) {
      const y = -9998 + Math.floor(rng() * (9999 - -9998 + 1))
      const m = 1 + Math.floor(rng() * 12)
      const d = 15 // valid in every month
      expect(weekdayOfYMD(y, m, d)).toBe(refWeekdayJDN(y, m, d))
    }
  })

  it('is exactly periodic every 400 years (incl. across year 0)', () => {
    for (const y of [-800, -401, -100, 0, 99, 1582, 1900, 2024]) {
      expect(weekdayOfYMD(y, 7, 15)).toBe(weekdayOfYMD(y + 400, 7, 15))
    }
  })

  it('Conway and Odd+11 agree on the year doomsday for BC years', () => {
    for (const y of [-4999, -1200, -400, -1, 0]) {
      expect(yearDoomsdayConway(y)).toBe(yearDoomsdayOddEleven(y))
    }
  })

  it('centuryAnchor is normalized for negative centuries (no negative mod leak)', () => {
    // 4/4 is an anchor, so its weekday equals the year doomsday for any year.
    for (const y of [-4300, -300, -7, 0]) {
      expect(weekdayOfYMD(y, 4, 4)).toBe(yearDoomsdayOddEleven(y))
    }
  })
})
