import { describe, it, expect, beforeEach } from 'vitest'
import { addAttempt, listAttempts, countByDay } from './attempts'
import { _resetDbForTests } from './db'

const base = {
  targetDate: '1986-03-14',
  correctWeekday: 5,
  guessedWeekday: 5,
  correct: true,
  durationMs: 4200,
  mode: 'quick',
  anchorCorrect: null,
  yearDoomCorrect: null,
  offsetCorrect: null,
  timed: false,
} as const

describe('attempts', () => {
  beforeEach(async () => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })

  it('adds and lists attempts ordered by timestamp desc', async () => {
    await addAttempt({ ...base, timestamp: 100 })
    await addAttempt({ ...base, timestamp: 300 })
    await addAttempt({ ...base, timestamp: 200 })
    const list = await listAttempts()
    expect(list.map((a) => a.timestamp)).toEqual([300, 200, 100])
  })

  it('counts attempts per local day', async () => {
    const d = new Date(2026, 5, 16, 9).getTime()
    await addAttempt({ ...base, timestamp: d })
    await addAttempt({ ...base, timestamp: d + 1000 })
    const counts = await countByDay()
    expect(counts['2026-06-16']).toBe(2)
  })
})
