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
  monthAnchorCorrect: null,
  offsetCorrect: null,
  timed: false,
  ...over,
})
const has = (a: ReturnType<typeof achievements>, id: string) => a.find((x) => x.id === id)!.earned

const ALL_STAGES = ['mod7', 'leap', 'months', 'thisyear', 'century', 'year', 'full']

describe('achievements', () => {
  it('nothing earned with no data', () => {
    expect(achievements([], 0, []).every((x) => !x.earned)).toBe(true)
  })
  it('first + speed on one fast correct solve', () => {
    const a = achievements([mk({ correct: true, durationMs: 2000 })], 0, [])
    expect(has(a, 'first')).toBe(true)
    expect(has(a, 'speed')).toBe(true)
    expect(has(a, 'ten')).toBe(false)
  })
  it('streak achievements from longestStreak', () => {
    expect(has(achievements([mk({})], 7, []), 'streak7')).toBe(true)
    expect(has(achievements([mk({})], 7, []), 'streak30')).toBe(false)
  })
  it('sharp needs 20+ solves at 90%+', () => {
    const many = Array.from({ length: 20 }, () => mk({ correct: true, durationMs: 5000 }))
    expect(has(achievements(many, 0, []), 'sharp')).toBe(true)
  })
  it('firstLesson earned by a correct learn:* rep, not by practice-only history', () => {
    const lesson = achievements([mk({ correct: true, mode: 'learn:mod7' })], 0, [])
    expect(has(lesson, 'firstLesson')).toBe(true)
    const practiceOnly = achievements([mk({ correct: true, mode: 'quick' })], 0, [])
    expect(has(practiceOnly, 'firstLesson')).toBe(false)
  })
  it('learn:* reps do not inflate practice milestones', () => {
    const lessons = Array.from({ length: 10 }, () => mk({ correct: true, mode: 'learn:mod7' }))
    const a = achievements(lessons, 0, [])
    expect(has(a, 'first')).toBe(false)
    expect(has(a, 'ten')).toBe(false)
  })
  it('internalized earned only when every stage is completed', () => {
    expect(has(achievements([], 0, ALL_STAGES), 'internalized')).toBe(true)
    // One short of complete must NOT earn it — probe the actual boundary.
    expect(has(achievements([], 0, ALL_STAGES.slice(0, -1)), 'internalized')).toBe(false)
  })
})
