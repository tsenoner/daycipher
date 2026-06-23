import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatYear,
  formatCentury,
  weekdayShort,
  weekdayName,
  orderedWeekdays,
  monthName,
  ordinal,
} from './format'

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
  it('ordinal handles the rd/st/nd cases and the teen exception', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd') // the anchor day that "3th" got wrong
    expect(ordinal(4)).toBe('4th')
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(13)).toBe('13th')
    expect(ordinal(21)).toBe('21st')
    expect(ordinal(29)).toBe('29th')
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

  it('formatCentury labels century blocks by their astronomical start year', () => {
    expect(formatCentury(1900)).toBe('1900s')
    expect(formatCentury(0)).toBe('1–99 AD') // 1 BC + 1–99 AD, labelled as the first AD century
    expect(formatCentury(-100)).toBe('101 BC')
  })
})
