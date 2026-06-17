import { describe, it, expect } from 'vitest'
import { summarize, accuracyByDimension, weakest } from './stats'
import type { Attempt } from '../../db/db'

const mk = (over: Partial<Attempt>): Attempt => ({
  timestamp: 0, targetDate: '2001-01-01', correctWeekday: 1, guessedWeekday: 1,
  correct: true, durationMs: 1000, mode: 'quick',
  anchorCorrect: null, yearDoomCorrect: null, offsetCorrect: null, timed: false,
  ...over,
})

describe('summarize', () => {
  it('counts and medians', () => {
    const s = summarize([
      mk({ correct: true, durationMs: 1000 }),
      mk({ correct: false, durationMs: 3000 }),
      mk({ correct: true, durationMs: 2000 }),
    ])
    expect(s.total).toBe(3)
    expect(s.correct).toBe(2)
    expect(s.accuracy).toBeCloseTo(2 / 3)
    expect(s.medianMs).toBe(2000)
  })
  it('empty', () => {
    expect(summarize([])).toEqual({ total: 0, correct: 0, accuracy: 0, medianMs: null })
  })
})

describe('accuracyByDimension', () => {
  it('groups by century', () => {
    const b = accuracyByDimension(
      [mk({ targetDate: '1985-03-14' }), mk({ targetDate: '2001-02-02', correct: false }), mk({ targetDate: '1999-12-31' })],
      'century',
    )
    expect(b.map((x) => x.label)).toEqual(['1900s', '2000s'])
    expect(b[0]).toMatchObject({ total: 2, correct: 2 })
    expect(b[1]).toMatchObject({ total: 1, correct: 0 })
  })
  it('groups by weekday', () => {
    const b = accuracyByDimension([mk({ correctWeekday: 1 }), mk({ correctWeekday: 5 })], 'weekday')
    expect(b.map((x) => x.label)).toEqual(['Monday', 'Friday'])
  })
})

describe('weakest', () => {
  it('picks lowest accuracy with enough data', () => {
    const buckets = accuracyByDimension(
      [
        mk({ targetDate: '1900-01-01', correct: true }), mk({ targetDate: '1900-02-01', correct: true }), mk({ targetDate: '1900-03-01', correct: true }),
        mk({ targetDate: '1800-01-01', correct: false }), mk({ targetDate: '1800-02-01', correct: false }), mk({ targetDate: '1800-03-01', correct: true }),
      ],
      'century',
    )
    expect(weakest(buckets)?.label).toBe('1800s')
  })
  it('ignores under-min buckets', () => {
    const buckets = accuracyByDimension([mk({ targetDate: '1700-01-01', correct: false })], 'century')
    expect(weakest(buckets, 3)).toBeNull()
  })
})
