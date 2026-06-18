import { describe, it, expect } from 'vitest'
import { coveringPick, nextLessonProblem } from './lessonGen'
import { makeRng, isLeapYear } from '../../engine'

describe('coveringPick', () => {
  it('deals every item once per cycle before repeating', () => {
    const domain = ['a', 'b', 'c', 'd'] as const
    const cycle0 = [0, 1, 2, 3].map((i) => coveringPick(domain, 42, i))
    const cycle1 = [4, 5, 6, 7].map((i) => coveringPick(domain, 42, i))
    expect(new Set(cycle0).size).toBe(4)
    expect(new Set(cycle1).size).toBe(4)
  })
})

describe('leap stage', () => {
  it('covers all four leap-rule classes within the first four problems', () => {
    const classOf = (y: number): string => {
      if (y % 4 !== 0) return 'notdiv4'
      if (y % 100 !== 0) return 'div4not100'
      if (y % 400 !== 0) return 'div100not400'
      return 'div400'
    }

    const rng = makeRng(5)
    const results = [0, 1, 2, 3].map((index) => {
      const p = nextLessonProblem('leap', rng, { index, runSeed: 99 })
      const isBc = /BC/.test(p.prompt)
      const magnitude = Number(p.prompt.replace(/[^\d]/g, '').match(/\d+/)?.[0])
      const year = isBc ? 1 - magnitude : magnitude
      return { correct: p.correct, year }
    })

    // All four leap-rule classes must appear across the covering cycle.
    const classes = results.map((r) => classOf(r.year))
    expect(new Set(classes).size).toBe(4)

    // Every prompt's stated flag agrees with the engine.
    for (const r of results) {
      expect(r.correct).toBe(isLeapYear(r.year) ? 1 : 0)
    }
  })

  it('reaches century cases beyond the old 1900-2099 pool over many runs', () => {
    const years = new Set<number>()
    for (let s = 0; s < 200; s++) {
      const p = nextLessonProblem('leap', makeRng(s), { index: 0, runSeed: s })
      years.add(Number(p.prompt.replace(/[^\d-]/g, '').match(/-?\d+/)?.[0]))
    }
    // The wide distribution must produce at least one year outside 1900-2099.
    expect([...years].some((y) => y < 1900 || y > 2099)).toBe(true)
  })
})
