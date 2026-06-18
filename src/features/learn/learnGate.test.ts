import { describe, it, expect, beforeEach } from 'vitest'
import {
  isStageUnlocked,
  isPracticeUnlocked,
  nextStageId,
  unlockedDailyMaxStageIndex,
  markStageComplete,
  getCompleted,
  getPracticeUnlocked,
} from './learnGate'
import { CURRICULUM } from './curriculum'
import { getMeta } from '../../db/meta'
import { _resetDbForTests } from '../../db/db'

const ALL = CURRICULUM.map((s) => s.id)

describe('isStageUnlocked', () => {
  it('the first stage is always unlocked', () => {
    expect(isStageUnlocked('mod7', [])).toBe(true)
  })
  it('a later stage opens iff the previous one is completed', () => {
    expect(isStageUnlocked('months', [])).toBe(false)
    expect(isStageUnlocked('months', ['mod7'])).toBe(true)
    expect(isStageUnlocked('thisyear', ['mod7'])).toBe(false)
    expect(isStageUnlocked('thisyear', ['mod7', 'months'])).toBe(true)
  })
  it('keys off curriculum order, not completion of unrelated stages', () => {
    expect(isStageUnlocked('thisyear', ['century', 'year'])).toBe(false)
  })
  it('an unknown id is treated as locked', () => {
    expect(isStageUnlocked('nope', ALL)).toBe(false)
  })
})

describe('isPracticeUnlocked', () => {
  it('the latch wins regardless of completion', () => {
    expect(isPracticeUnlocked([], true)).toBe(true)
  })
  it('opens when all 7 stages are completed', () => {
    expect(isPracticeUnlocked(ALL, false)).toBe(true)
  })
  it('stays locked while any stage is missing and no latch', () => {
    expect(isPracticeUnlocked(ALL.slice(0, 6), false)).toBe(false)
  })
})

describe('nextStageId', () => {
  it('is the first stage when nothing is done', () => {
    expect(nextStageId([])).toBe('mod7')
  })
  it('is the first not-yet-completed stage in order', () => {
    expect(nextStageId(['mod7'])).toBe('months')
    expect(nextStageId(['mod7', 'months', 'thisyear'])).toBe('century')
  })
  it('ignores out-of-order completion gaps and returns the earliest hole', () => {
    expect(nextStageId(['mod7', 'thisyear'])).toBe('months')
  })
  it('is null once every stage is completed', () => {
    expect(nextStageId(ALL)).toBeNull()
  })
})

describe('unlockedDailyMaxStageIndex', () => {
  it('is the count of leading completed stages (sequential prefix)', () => {
    expect(unlockedDailyMaxStageIndex([])).toBe(0)
    expect(unlockedDailyMaxStageIndex(['mod7'])).toBe(1)
    expect(unlockedDailyMaxStageIndex(['mod7', 'months', 'thisyear'])).toBe(3)
    expect(unlockedDailyMaxStageIndex(ALL)).toBe(7)
  })
  it('stops at the first sequential gap', () => {
    expect(unlockedDailyMaxStageIndex(['mod7', 'thisyear', 'century'])).toBe(1)
  })
})

describe('markStageComplete', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })

  it('unions a stage id into learnCompleted, idempotently', async () => {
    expect(await markStageComplete('mod7')).toEqual(['mod7'])
    expect(await markStageComplete('mod7')).toEqual(['mod7'])
    expect(await markStageComplete('months')).toEqual(['mod7', 'months'])
    expect(await getMeta('learnCompleted', [])).toEqual(['mod7', 'months'])
  })

  it('does not flip practiceUnlocked until all 7 are present', async () => {
    for (const id of ALL.slice(0, 6)) await markStageComplete(id)
    expect(await getMeta('practiceUnlocked', false)).toBe(false)
  })

  it('flips practiceUnlocked once learnCompleted covers all 7', async () => {
    for (const id of ALL) await markStageComplete(id)
    expect(await getMeta('practiceUnlocked', false)).toBe(true)
  })
})

describe('getCompleted / getPracticeUnlocked readers', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })

  it('default to empty / false before anything is recorded', async () => {
    expect(await getCompleted()).toEqual([])
    expect(await getPracticeUnlocked()).toBe(false)
  })

  it('reflect learnCompleted and the latch after completing every stage', async () => {
    for (const id of ALL) await markStageComplete(id)
    expect(await getCompleted()).toEqual(ALL)
    expect(await getPracticeUnlocked()).toBe(true)
  })
})
