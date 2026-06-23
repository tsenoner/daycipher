import { describe, it, expect } from 'vitest'
import { CURRICULUM, getStage, type Block } from './curriculum'
import { weekdayOfYMD, yearDoomsdayOddEleven } from '../../engine'
import { weekdayName } from '../../lib/format'

describe('curriculum', () => {
  it('has 7 stages with unique ids and ascending n', () => {
    expect(CURRICULUM).toHaveLength(7)
    expect(new Set(CURRICULUM.map((s) => s.id)).size).toBe(7)
    expect(CURRICULUM.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
  it('ends on the accuracy stage `full` — no timed speed gate', () => {
    expect(CURRICULUM[CURRICULUM.length - 1].id).toBe('full')
    expect(getStage('speed')).toBeUndefined()
    expect(CURRICULUM.some((s) => 'timed' in s)).toBe(false)
  })
  it('teaches leap-year determination as its own stage', () => {
    expect(getStage('leap')?.title).toBe('Leap years')
    expect(CURRICULUM.findIndex((s) => s.id === 'leap')).toBe(1) // right after mod7
  })
  it('Stage 2 teaches the last-two-digits ÷4 shortcut (#7)', () => {
    const text = JSON.stringify(getStage('leap')?.blocks).toLowerCase()
    expect(text).toContain('last two digits')
    expect(text).toContain('unless they are 00') // the xx00 carve-out is still called out
  })
  it('Stage 3 labels Jan/Feb anchors common-year vs leap, leaving others unqualified (#8)', () => {
    const items = (getStage('months')?.blocks ?? [])
      .filter((b): b is Extract<Block, { kind: 'list' }> => b.kind === 'list')
      .flatMap((b) => b.items)
    const jan = items.find((i) => /january/i.test(i)) ?? ''
    const feb = items.find((i) => /february/i.test(i)) ?? ''
    for (const item of [jan, feb]) {
      expect(item).toMatch(/common year/i) // lead value labeled non-leap
      expect(item).toMatch(/leap year/i) // secondary value labeled leap
    }
    expect(jan).toContain('3')
    expect(jan).toContain('4')
    expect(feb).toContain('28')
    expect(feb).toContain('29')
    // Even-month doubles (4/4 … 12/12) are leap-invariant — they must NOT gain a
    // leap qualifier. Match same-number-both-sides so March's "3/14" is excluded.
    const doubles = items.filter((i) => /\b(\d+)\/\1\b/.test(i))
    expect(doubles.length).toBeGreaterThan(0)
    for (const d of doubles) expect(d).not.toMatch(/leap/i)
  })
  it('every stage has content', () => {
    for (const s of CURRICULUM) expect(s.blocks.length).toBeGreaterThan(0)
  })
  it('getStage resolves ids', () => {
    expect(getStage('full')?.title).toBe('Any date, end to end')
    expect(getStage('nope')).toBeUndefined()
  })
  it('every checked worked example agrees with the engine', () => {
    // Verifies each example's final answer against the engine; the prose steps are not machine-checked.
    const examples = CURRICULUM.flatMap((s) =>
      s.blocks.filter((b): b is Extract<Block, { kind: 'example' }> => b.kind === 'example'),
    )
    expect(examples.length).toBeGreaterThan(0) // guard: don't silently check nothing
    // Every example must carry a `check` — otherwise a new example with a
    // wrong hand-written answer would slip through unverified.
    expect(examples.every((e) => e.check)).toBe(true)
    for (const e of examples) {
      const c = e.check!
      const w =
        c.kind === 'ymd' ? weekdayOfYMD(c.year, c.month, c.day) : yearDoomsdayOddEleven(c.year)
      expect(e.answer.startsWith(weekdayName(w))).toBe(true)
    }
  })
})
