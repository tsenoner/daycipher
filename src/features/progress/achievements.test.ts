import { describe, it, expect } from 'vitest'
import { achievements } from './achievements'
import type { Attempt } from '../../db/db'

const mk = (over: Partial<Attempt>): Attempt => ({
  timestamp: 0,
  targetDate: '2001-01-01',
  correctWeekday: 1,
  guessedWeekday: 1,
  correct: true,
  durationMs: 1000,
  mode: 'quick',
  anchorCorrect: null,
  yearDoomCorrect: null,
  offsetCorrect: null,
  timed: false,
  ...over,
})
const has = (a: ReturnType<typeof achievements>, id: string) => a.find((x) => x.id === id)!.earned

describe('achievements', () => {
  it('nothing earned with no data', () => {
    expect(achievements([], 0).every((x) => !x.earned)).toBe(true)
  })
  it('first + speed on one fast correct solve', () => {
    const a = achievements([mk({ correct: true, durationMs: 2000 })], 0)
    expect(has(a, 'first')).toBe(true)
    expect(has(a, 'speed')).toBe(true)
    expect(has(a, 'ten')).toBe(false)
  })
  it('streak achievements from longestStreak', () => {
    expect(has(achievements([mk({})], 7), 'streak7')).toBe(true)
    expect(has(achievements([mk({})], 7), 'streak30')).toBe(false)
  })
  it('sharp needs 20+ solves at 90%+', () => {
    const many = Array.from({ length: 20 }, () => mk({ correct: true, durationMs: 5000 }))
    expect(has(achievements(many, 0), 'sharp')).toBe(true)
  })
})
