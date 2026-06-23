import { describe, it, expect, beforeEach } from 'vitest'
import {
  addAttempt,
  listAttempts,
  countByDay,
  isLearnAttempt,
  practiceAttempts,
  isChallengeAttempt,
  recordAttempt,
} from './attempts'
import { getMeta } from './meta'
import { type Attempt } from './db'
import { resetTestDb } from '../test/resetDb'

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

const mk = (mode: string): Attempt => ({ ...base, timestamp: 1, mode })

describe('attempts', () => {
  beforeEach(resetTestDb)

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

describe('challenge attempts are excluded from practice stats', () => {
  it('drops level:test and speed:challenge, keeps quick/guided/speedrun/daily', () => {
    expect(isChallengeAttempt(mk('level:test'))).toBe(true)
    expect(isChallengeAttempt(mk('speed:challenge'))).toBe(true)
    expect(isChallengeAttempt(mk('quick'))).toBe(false)
    const kept = practiceAttempts([mk('quick'), mk('level:test'), mk('speed:challenge'), mk('daily')])
    expect(kept.map((a) => a.mode)).toEqual(['quick', 'daily'])
  })
})

describe('recordAttempt credits the streak only on a correct answer', () => {
  beforeEach(resetTestDb)

  it('a wrong attempt is stored but does not keep the streak alive; a correct one does', async () => {
    await recordAttempt({ ...mk('quick'), correct: false })
    expect(await listAttempts()).toHaveLength(1) // still recorded for accuracy/picker
    expect(await getMeta('currentStreak', 0)).toBe(0) // but no streak credit

    await recordAttempt({ ...mk('quick'), correct: true })
    expect(await getMeta('currentStreak', 0)).toBe(1)
  })
})
