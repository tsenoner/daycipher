import { describe, it, expect, beforeEach } from 'vitest'
import {
  isStageUnlocked,
  isPracticeUnlocked,
  nextStageId,
  markStageComplete,
  getCompleted,
  getPracticeUnlocked,
} from './learnGate'
import { CURRICULUM } from './curriculum'
import { getMeta } from '../../db/meta'
import { resetTestDb } from '../../test/resetDb'

const ALL = CURRICULUM.map((s) => s.id)

describe('isStageUnlocked', () => {
  it('the first stage is always unlocked', () => {
    expect(isStageUnlocked('mod7', [])).toBe(true)
  })
  it('a later stage opens iff the previous one is completed', () => {
    expect(isStageUnlocked('leap', [])).toBe(false)
    expect(isStageUnlocked('leap', ['mod7'])).toBe(true)
    expect(isStageUnlocked('months', ['mod7'])).toBe(false)
    expect(isStageUnlocked('months', ['mod7', 'leap'])).toBe(true)
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
  it('opens when every stage is completed', () => {
    expect(isPracticeUnlocked(ALL, false)).toBe(true)
  })
  it('opens once the 7 accuracy stages ending on `full` are completed', () => {
    expect(ALL).toHaveLength(7)
    expect(ALL[ALL.length - 1]).toBe('full')
    expect(isPracticeUnlocked(ALL, false)).toBe(true)
  })
  it('stays locked while any stage is missing and no latch', () => {
    expect(isPracticeUnlocked(ALL.slice(0, -1), false)).toBe(false)
  })
})

describe('nextStageId', () => {
  it('is the first stage when nothing is done', () => {
    expect(nextStageId([])).toBe('mod7')
  })
  it('is the first not-yet-completed stage in order', () => {
    expect(nextStageId(['mod7'])).toBe('leap')
    expect(nextStageId(['mod7', 'leap'])).toBe('months')
    expect(nextStageId(['mod7', 'leap', 'months', 'thisyear'])).toBe('century')
  })
  it('ignores out-of-order completion gaps and returns the earliest hole', () => {
    expect(nextStageId(['mod7', 'thisyear'])).toBe('leap')
  })
  it('is null once every stage is completed', () => {
    expect(nextStageId(ALL)).toBeNull()
  })
})

describe('markStageComplete', () => {
  beforeEach(resetTestDb)

  it('unions a stage id into learnCompleted, idempotently', async () => {
    expect(await markStageComplete('mod7')).toEqual(['mod7'])
    expect(await markStageComplete('mod7')).toEqual(['mod7'])
    expect(await markStageComplete('months')).toEqual(['mod7', 'months'])
    expect(await getMeta('learnCompleted', [])).toEqual(['mod7', 'months'])
  })

  it('does not flip practiceUnlocked until every stage is present', async () => {
    for (const id of ALL.slice(0, -1)) await markStageComplete(id)
    expect(await getMeta('practiceUnlocked', false)).toBe(false)
  })

  it('flips practiceUnlocked once learnCompleted covers every stage', async () => {
    for (const id of ALL) await markStageComplete(id)
    expect(await getMeta('practiceUnlocked', false)).toBe(true)
  })
})

describe('getCompleted / getPracticeUnlocked readers', () => {
  beforeEach(resetTestDb)

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
