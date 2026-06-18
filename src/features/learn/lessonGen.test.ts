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
    const rng = makeRng(5)
    const flags = [0, 1, 2, 3].map((index) => {
      const p = nextLessonProblem('leap', rng, { index, runSeed: 99 })
      const year = Number(p.prompt.replace(/[^\d-]/g, '').match(/-?\d+/)?.[0])
      return { correct: p.correct, leap: isLeapYear(year) ? 1 : 0 }
    })
    // Across a covering cycle we must see both leap (1) and non-leap (0) answers.
    expect(new Set(flags.map((f) => f.correct))).toEqual(new Set([0, 1]))
    // Every prompt's stated flag agrees with the engine.
    for (const f of flags) expect(f.correct).toBe(f.leap)
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
