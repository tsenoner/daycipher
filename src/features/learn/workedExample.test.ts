import { describe, it, expect } from 'vitest'
import { generateWorkedExample, WORKED_STAGES } from './workedExample'
import { makeRng, weekdayOfYMD, yearDoomsdayOddEleven } from '../../engine'
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

  it('shows a computed-anchor step for exotic (non-taught) centuries', () => {
    // Force exotic years by scanning seeds until one lands outside 1700-2100.
    let found = false
    for (let s = 0; s < 500 && !found; s++) {
      const e = generateWorkedExample('full', makeRng(s))
      const c = e.check as { kind: 'ymd'; year: number }
      if (c.year < 1700 || c.year > 2100) {
        found = true
        expect(e.steps.some((step) => /mod 4|5\s*×/.test(step))).toBe(true)
      }
    }
    expect(found).toBe(true)
  })
})
