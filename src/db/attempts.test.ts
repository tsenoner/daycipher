import { describe, it, expect, beforeEach } from 'vitest'
import { addAttempt, listAttempts, countByDay, isLearnAttempt, practiceAttempts, isChallengeAttempt } from './attempts'
import { _resetDbForTests, type Attempt } from './db'

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

describe('learn-attempt filters', () => {
  const mk = (mode: string): Attempt => ({ ...base, timestamp: 1, mode })

  it('isLearnAttempt is true only for learn:* modes', () => {
    expect(isLearnAttempt(mk('learn:mod7'))).toBe(true)
    expect(isLearnAttempt(mk('learn:speed'))).toBe(true)
    expect(isLearnAttempt(mk('quick'))).toBe(false)
    expect(isLearnAttempt(mk('daily'))).toBe(false)
    expect(isLearnAttempt(mk('guided'))).toBe(false)
  })

  it('practiceAttempts drops learn:* rows and keeps the rest', () => {
    const rows = [mk('quick'), mk('learn:mod7'), mk('daily'), mk('learn:century')]
    expect(practiceAttempts(rows).map((a) => a.mode)).toEqual(['quick', 'daily'])
  })
})

const mkChallenge = (mode: string): Attempt => ({
  mode, correct: true, timestamp: 0, targetDate: '', correctWeekday: 0, guessedWeekday: 0,
  durationMs: 0, anchorCorrect: null, yearDoomCorrect: null, offsetCorrect: null, timed: false,
})

describe('challenge attempts are excluded from practice stats', () => {
  it('drops level:test and speed:challenge, keeps quick/guided/speedrun/daily', () => {
    expect(isChallengeAttempt(mkChallenge('level:test'))).toBe(true)
    expect(isChallengeAttempt(mkChallenge('speed:challenge'))).toBe(true)
    expect(isChallengeAttempt(mkChallenge('quick'))).toBe(false)
    const kept = practiceAttempts([mkChallenge('quick'), mkChallenge('level:test'), mkChallenge('speed:challenge'), mkChallenge('daily')])
    expect(kept.map((a) => a.mode)).toEqual(['quick', 'daily'])
  })
})
