import { describe, it, expect } from 'vitest'
import { CURRICULUM, getStage, type Block } from './curriculum'

describe('curriculum', () => {
  it('has 7 stages with unique ids and ascending n', () => {
    expect(CURRICULUM).toHaveLength(7)
    expect(new Set(CURRICULUM.map((s) => s.id)).size).toBe(7)
    expect(CURRICULUM.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
  it('every stage has content', () => {
    for (const s of CURRICULUM) expect(s.blocks.length).toBeGreaterThan(0)
  })
  it('getStage resolves ids', () => {
    expect(getStage('full')?.title).toBe('Any date, end to end')
    expect(getStage('nope')).toBeUndefined()
  })
  it('the full-date worked example resolves to Friday', () => {
    const ex = getStage('full')!.blocks.find(
      (b): b is Extract<Block, { kind: 'example' }> => b.kind === 'example',
    )!
    expect(ex.answer).toBe('Friday')
  })
})
