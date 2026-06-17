import { describe, it, expect, beforeEach } from 'vitest'
import { getDone, markDone, isDone } from './learnProgress'
import { _resetDbForTests } from '../../db/db'

describe('learnProgress', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })
  it('starts empty', async () => {
    expect(await getDone()).toEqual([])
  })
  it('marks done idempotently', async () => {
    expect(await markDone('mod7')).toEqual(['mod7'])
    expect(await markDone('mod7')).toEqual(['mod7'])
    expect(await markDone('months')).toEqual(['mod7', 'months'])
    expect(await getDone()).toEqual(['mod7', 'months'])
  })
  it('isDone', () => {
    expect(isDone('a', ['a', 'b'])).toBe(true)
    expect(isDone('c', ['a'])).toBe(false)
  })
})
