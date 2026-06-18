import type { Weekday } from './types'
import { yearDoomsdayOddEleven } from './doomsday'

/** The current calendar year, read once at module load (matches TodayScreen's `new Date()`). */
export const CURRENT_YEAR = new Date().getFullYear()

/** This year's doomsday weekday — the one fact stage 3 ("Dates in this year") builds on. */
export function thisYearDoomsday(): Weekday {
  return yearDoomsdayOddEleven(CURRENT_YEAR)
}
