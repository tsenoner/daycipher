import { describe, it, expect } from 'vitest'
import { dailyDates, dailyRange } from './daily'
import { isLeapYear, CURRENT_YEAR } from '../../engine'
import { CURRICULUM } from '../learn/curriculum'

describe('dailyRange', () => {
  it('scopes to the current year when nothing is completed and not unlocked', () => {
    expect(dailyRange([], false)).toEqual({ minYear: CURRENT_YEAR, maxYear: CURRENT_YEAR })
  })
  it('opens the full range once Practice is unlocked', () => {
    expect(dailyRange([], true)).toEqual({ minYear: 1900, maxYear: 2099 })
  })
  it('opens the full range once the completed prefix reaches century (>= 4)', () => {
    const firstFour = CURRICULUM.slice(0, 4).map((s) => s.id)
    expect(dailyRange(firstFour, false)).toEqual({ minYear: 1900, maxYear: 2099 })
  })
})

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
  it('scopes to the current year when given a current-year range', () => {
    const ds = dailyDates('2026-06-17', 5, dailyRange([], false))
    expect(ds).toHaveLength(5)
    for (const { year } of ds) {
      expect(year).toBe(CURRENT_YEAR)
    }
  })
})
