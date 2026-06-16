import { describe, it, expect } from 'vitest'
import { formatDate, weekdayShort, weekdayName, orderedWeekdays } from './format'

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
})
