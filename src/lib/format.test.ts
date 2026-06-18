import { describe, it, expect } from 'vitest'
import { formatDate, formatYear, weekdayShort, weekdayName, orderedWeekdays, monthName } from './format'

describe('format', () => {
  it('formatDate -> "14 March 1986"', () => {
    expect(formatDate(1986, 3, 14)).toBe('14 March 1986')
    expect(formatDate(2000, 1, 1)).toBe('1 January 2000')
  })
  it('weekday names', () => {
    expect(weekdayName(0)).toBe('Sunday')
    expect(weekdayShort(0)).toBe('Sun')
    expect(weekdayShort(6)).toBe('Sat')
  })
  it('orderedWeekdays respects week start', () => {
    expect(orderedWeekdays(1)).toEqual([1, 2, 3, 4, 5, 6, 0])
    expect(orderedWeekdays(0)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
  it('monthName', () => {
    expect(monthName(3)).toBe('March')
    expect(monthName(12)).toBe('December')
  })
})

describe('era-aware year/date formatting', () => {
  it('labels BC for astronomical years <= 0', () => {
    expect(formatYear(2005)).toBe('2005')
    expect(formatYear(1)).toBe('1')
    expect(formatYear(0)).toBe('1 BC')
    expect(formatYear(-1)).toBe('2 BC')
    expect(formatYear(-1199)).toBe('1200 BC')
  })

  it('formatDate renders the era label', () => {
    expect(formatDate(2030, 12, 25)).toBe('25 December 2030')
    expect(formatDate(-1199, 3, 14)).toBe('14 March 1200 BC')
  })
})
