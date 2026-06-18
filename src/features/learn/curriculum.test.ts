import { describe, it, expect } from 'vitest'
import { CURRICULUM, getStage, type Block } from './curriculum'
import { weekdayOfYMD, yearDoomsdayOddEleven } from '../../engine'
import { weekdayName } from '../../lib/format'

describe('curriculum', () => {
  it('has 8 stages with unique ids and ascending n', () => {
    expect(CURRICULUM).toHaveLength(8)
    expect(new Set(CURRICULUM.map((s) => s.id)).size).toBe(8)
    expect(CURRICULUM.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
  it('teaches leap-year determination as its own stage', () => {
    expect(getStage('leap')?.title).toBe('Leap years')
    expect(CURRICULUM.findIndex((s) => s.id === 'leap')).toBe(1) // right after mod7
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
    const checked = examples.filter((e) => e.check)
    expect(checked.length).toBeGreaterThan(0) // guard: don't silently check nothing
    // Every example must carry a `check` — otherwise a new example with a
    // wrong hand-written answer would slip through unverified.
    expect(checked.length).toBe(examples.length)
    for (const e of checked) {
      const w =
        e.check!.kind === 'ymd'
          ? weekdayOfYMD(e.check!.year, e.check!.month, e.check!.day)
          : yearDoomsdayOddEleven(e.check!.year)
      expect(e.answer.startsWith(weekdayName(w))).toBe(true)
    }
  })
})
