/** 0 = Sunday … 6 = Saturday (Doomsday convention). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export interface StepTrace {
  year: number
  month: number
  day: number
  leap: boolean
  centuryAnchor: Weekday
  yearDoomsday: Weekday
  /** worked Odd+11 substeps for display */
  oddEleven: {
    start: number
    afterStep1: number
    halved: number
    afterStep3: number
    finalAdd: number
  }
  monthAnchorDay: number
  /** weekday of the month's anchor date — equals yearDoomsday */
  monthAnchorWeekday: Weekday
  /** reduced day offset from the month anchor, in -3..3 */
  offset: number
  result: Weekday
}
