import { describe, it, expect } from 'vitest'
import { CURRENT_YEAR, thisYearDoomsday } from './today'
import { yearDoomsdayOddEleven } from './doomsday'

describe('today helpers', () => {
  it('CURRENT_YEAR is the integer system year', () => {
    expect(CURRENT_YEAR).toBe(new Date().getFullYear())
    expect(Number.isInteger(CURRENT_YEAR)).toBe(true)
  })

  it("thisYearDoomsday matches the engine's year doomsday for the current year", () => {
    const d = thisYearDoomsday()
    expect(d).toBe(yearDoomsdayOddEleven(CURRENT_YEAR))
    expect(d).toBeGreaterThanOrEqual(0)
    expect(d).toBeLessThanOrEqual(6)
  })
})
