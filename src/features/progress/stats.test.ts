import { describe, it, expect } from 'vitest'
import { summarize, accuracyByDimension, weakest, stepStats } from './stats'
import { gradeNumber } from '../practice/drill'
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
  it('averages the two middle values for an even number of timed solves', () => {
    const s = summarize([
      mk({ durationMs: 1000 }),
      mk({ durationMs: 2000 }),
      mk({ durationMs: 3000 }),
      mk({ durationMs: 4000 }),
    ])
    expect(s.medianMs).toBe(2500)
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
  it('parses wide-range years robustly (short AD and BC), not via slice(0,4)', () => {
    // A 3-digit year would have broken slice(0,4) ("750-" -> NaN -> Unknown).
    const ad = accuracyByDimension([mk({ targetDate: '750-03-14' })], 'century')
    expect(ad).toHaveLength(1)
    expect(ad[0]).toMatchObject({ key: '700', label: '700s' })
    // A BC (negative astronomical) year buckets to a BC-labelled century.
    const bc = accuracyByDimension([mk({ targetDate: '-44-03-15' })], 'century')
    expect(bc[0]).toMatchObject({ key: '-100', label: '101 BC' })
    expect(bc[0].label).not.toBe('Unknown')
    // First-century-AD years (1–99) live in century 0 — labelled AD, never "1 BC".
    const early = accuracyByDimension([mk({ targetDate: '47-03-14' })], 'century')
    expect(early[0]).toMatchObject({ key: '0', label: '1–99 AD' })
  })
  it('skips learn:* rows so a day-of-month is never bucketed as a weekday', () => {
    // gradeNumber stashes the day-of-month (29) in correctWeekday; the learn guard
    // must drop it before the `as Weekday` cast — no bucket, no throw.
    const learn = gradeNumber(29, 29, 'learn:months', 0)
    const b = accuracyByDimension([learn, mk({ correctWeekday: 1 })], 'weekday')
    expect(b.map((x) => x.label)).toEqual(['Monday'])
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

describe('stepStats', () => {
  it('counts per-step wrongs over guided attempts only', () => {
    const guided = [
      mk({ anchorCorrect: 1, yearDoomCorrect: 0, offsetCorrect: 1 }),
      mk({ anchorCorrect: 1, yearDoomCorrect: 0, offsetCorrect: 0 }),
    ]
    const quick = [mk({})]
    const s = stepStats([...guided, ...quick])
    expect(s.find((x) => x.step === 'year')).toMatchObject({ total: 2, wrong: 2 })
    expect(s.find((x) => x.step === 'anchor')).toMatchObject({ total: 2, wrong: 0 })
    expect(s.find((x) => x.step === 'offset')).toMatchObject({ total: 2, wrong: 1 })
  })
})
