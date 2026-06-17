import { describe, it, expect } from 'vitest'
import { dailyDates } from './daily'
import { isLeapYear } from '../../engine'

describe('dailyDates', () => {
  it('is deterministic per day key', () => {
    expect(dailyDates('2026-06-17')).toEqual(dailyDates('2026-06-17'))
  })
  it('differs across days', () => {
    expect(dailyDates('2026-06-17')).not.toEqual(dailyDates('2026-06-18'))
  })
  it('returns n valid in-range dates', () => {
    const ds = dailyDates('2026-06-17', 5)
    expect(ds).toHaveLength(5)
    for (const { year, month, day } of ds) {
      expect(year).toBeGreaterThanOrEqual(1900)
      expect(year).toBeLessThanOrEqual(2099)
      const dim = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
        month - 1
      ]
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(dim)
    }
  })
})
