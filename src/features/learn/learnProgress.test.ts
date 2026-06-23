import { describe, it, expect, beforeEach } from 'vitest'
import { getDone, isDone } from './learnProgress'
import { markStageComplete } from './learnGate'
import { resetTestDb } from '../../test/resetDb'

describe('learnProgress', () => {
  beforeEach(resetTestDb)
  it('starts empty', async () => {
    expect(await getDone()).toEqual([])
  })
  it('getDone reads learnCompleted', async () => {
    await markStageComplete('mod7')
    await markStageComplete('months')
    expect(await getDone()).toEqual(['mod7', 'months'])
  })
  it('isDone', () => {
    expect(isDone('a', ['a', 'b'])).toBe(true)
    expect(isDone('c', ['a'])).toBe(false)
  })
})
