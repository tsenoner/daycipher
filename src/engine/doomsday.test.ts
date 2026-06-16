import { describe, it, expect } from 'vitest'
import {
  isLeapYear,
  monthAnchor,
  centuryAnchor,
  yearDoomsdayOddEleven,
  yearDoomsdayConway,
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
