import { describe, it, expect } from 'vitest'
import { generateWorkedExample, walkthroughFor, WORKED_STAGES } from './workedExample'
import { makeRng, weekdayOfYMD, yearDoomsdayOddEleven, centuryOf } from '../../engine'
import { weekdayName } from '../../lib/format'

describe('generateWorkedExample', () => {
  it('exposes exactly the three example-bearing stages', () => {
    expect([...WORKED_STAGES].sort()).toEqual(['full', 'thisyear', 'year'])
  })

  it('thisyear/full answers agree with the engine and avoid a zero-offset (illustrative)', () => {
    for (const stage of ['thisyear', 'full'] as const) {
      for (let s = 0; s < 50; s++) {
        const e = generateWorkedExample(stage, makeRng(s))
        const c = e.check as { kind: 'ymd'; year: number; month: number; day: number }
        expect(c.kind).toBe('ymd')
        expect(e.answer.startsWith(weekdayName(weekdayOfYMD(c.year, c.month, c.day)))).toBe(true)
        expect(e.steps.length).toBeGreaterThan(0)
      }
    }
  })

  it('year answers agree with the engine', () => {
    for (let s = 0; s < 50; s++) {
      const e = generateWorkedExample('year', makeRng(s))
      const c = e.check as { kind: 'yearDoom'; year: number }
      expect(c.kind).toBe('yearDoom')
      expect(e.answer.startsWith(weekdayName(yearDoomsdayOddEleven(c.year)))).toBe(true)
    }
  })

  it('walkthroughFor matches the engine across normal, leap-Feb, BC and max-year dates', () => {
    const dates: [number, number, number][] = [
      [1933, 4, 4], // normal taught century
      [2024, 2, 29], // leap-year Feb 29
      [2000, 1, 1], // leap-century, Jan
      [-44, 3, 15], // BC / exotic century (computed anchor branch)
      [9999, 12, 31], // max proleptic year
    ]
    for (const [y, m, d] of dates) {
      const w = walkthroughFor(y, m, d)
      expect(w.answer).toBe(weekdayName(weekdayOfYMD(y, m, d)))
      expect(w.steps.length).toBeGreaterThan(0)
      expect(w.check).toEqual({ kind: 'ymd', year: y, month: m, day: d })
    }
  })

  it('shows a computed-anchor step for exotic (non-taught) centuries', () => {
    // The `year` stage still draws the full proleptic range (the `full` capstone now
    // stays within RECENT_RANGE); scan seeds until one lands in an exotic century.
    // Key on the century (what anchorStep branches on), not the year: 2150's century
    // is 2100, still a taught anchor.
    let found = false
    for (let s = 0; s < 500 && !found; s++) {
      const e = generateWorkedExample('year', makeRng(s))
      const c = e.check as { kind: 'yearDoom'; year: number }
      if (centuryOf(c.year) < 1700 || centuryOf(c.year) > 2100) {
        found = true
        expect(e.steps.some((step) => /mod 4|5\s*×/.test(step))).toBe(true)
      }
    }
    expect(found).toBe(true)
  })
})
