import { describe, it, expect } from 'vitest'
import { bucket, buildHeatmap } from './heatmap'

describe('bucket', () => {
  it('levels', () => {
    expect(bucket(0, 10)).toBe(0)
    expect(bucket(10, 10)).toBe(4)
    expect(bucket(1, 10)).toBe(1)
    expect(bucket(5, 0)).toBe(0)
  })
})

describe('buildHeatmap', () => {
  it('builds a windowed grid ending this week', () => {
    const m = buildHeatmap({ '2026-06-17': 5 }, '2026-06-17', 2)
    expect(m.weeks).toHaveLength(2)
    expect(m.weeks.flat()).toHaveLength(14)
    expect(m.maxCount).toBe(5)
    const cell = m.weeks.flat().find((c) => c.date === '2026-06-17')!
    expect(cell.count).toBe(5)
    expect(cell.level).toBe(4)
    const sat = m.weeks.flat().find((c) => c.date === '2026-06-20')!
    expect(sat.count).toBe(0)
    expect(sat.level).toBe(0)
  })
  it('all zero when no data', () => {
    const m = buildHeatmap({}, '2026-06-17', 1)
    expect(m.maxCount).toBe(0)
    expect(m.weeks.flat().every((c) => c.level === 0)).toBe(true)
  })
  it('aligns columns to weekStart=1 (Monday-first)', () => {
    const m = buildHeatmap({}, '2026-06-17', 2, 1)
    const cells = m.weeks.flat()
    expect(cells[0].weekday).toBe(1) // each column starts on Monday
    expect(cells[6].weekday).toBe(0) // ...and ends on Sunday
    expect(cells[0].date).toBe('2026-06-08') // Monday of the window's first week
    expect(cells[cells.length - 1].date).toBe('2026-06-21') // Sunday of the current week
  })
  it('defaults to Sunday-first when no weekStart is given', () => {
    const m = buildHeatmap({}, '2026-06-17', 2)
    expect(m.weeks.flat()[0].weekday).toBe(0)
  })
})
