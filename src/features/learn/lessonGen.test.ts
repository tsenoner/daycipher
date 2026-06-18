import { describe, it, expect } from 'vitest'
import { coveringPick, nextLessonProblem } from './lessonGen'
import { makeRng, isLeapYear, centuryAnchor, weekdayOfYMD, yearDoomsdayOddEleven, daysInMonth } from '../../engine'

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

describe('century stage', () => {
  it('deals all five taught centuries within five problems', () => {
    const rng = makeRng(3)
    const prompts = [0, 1, 2, 3, 4].map(
      (index) => nextLessonProblem('century', rng, { index, runSeed: 8 }).prompt,
    )
    const decades = new Set(prompts.map((p) => p.match(/\d+/)![0]))
    expect(decades).toEqual(new Set(['1700', '1800', '1900', '2000', '2100']))
  })

  it('answers each century with its engine anchor', () => {
    const p = nextLessonProblem('century', makeRng(1), { index: 0, runSeed: 0 })
    const year = Number(p.prompt.match(/\d+/)![0])
    expect(p.correct).toBe(centuryAnchor(year))
  })
})

describe('wide year/full stages', () => {
  it('year draws beyond 1900-2099 over many seeds and grades via the engine', () => {
    const years = new Set<number>()
    for (let s = 0; s < 300; s++) {
      const p = nextLessonProblem('year', makeRng(s))
      const sign = /BC/.test(p.prompt) ? -1 : 1
      const mag = Number(p.prompt.match(/\d+/)![0])
      const year = sign < 0 ? 1 - mag : mag
      years.add(year)
      expect(p.correct).toBe(yearDoomsdayOddEleven(year))
    }
    expect([...years].some((y) => y < 1900 || y > 2099)).toBe(true)
  })

  it('full produces valid, engine-correct dated problems incl. BC', () => {
    let sawWide = false
    for (let s = 0; s < 300; s++) {
      const p = nextLessonProblem('full', makeRng(s))
      expect(p.date).not.toBeNull()
      const { year, month, day } = p.date!
      expect(day).toBeGreaterThanOrEqual(1)
      expect(day).toBeLessThanOrEqual(daysInMonth(year, month))
      expect(p.correct).toBe(weekdayOfYMD(year, month, day))
      if (year < 1900 || year > 2099) sawWide = true
    }
    expect(sawWide).toBe(true)
  })
})

describe('mod7 stage', () => {
  it('uses a widened addend-pair range', () => {
    // Over many seeds the pair branch must produce an addend above the old max of 6.
    let sawWide = false
    for (let s = 0; s < 400 && !sawWide; s++) {
      const p = nextLessonProblem('mod7', makeRng(s))
      const m = p.prompt.match(/^(\d+) \+ (\d+)/)
      if (m && (Number(m[1]) > 6 || Number(m[2]) > 6)) sawWide = true
    }
    expect(sawWide).toBe(true)
  })
})
