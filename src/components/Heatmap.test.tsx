import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Heatmap } from './Heatmap'
import type { HeatModel } from '../features/progress/heatmap'

const model: HeatModel = {
  maxCount: 3,
  weeks: [
    [
      { date: '2026-06-07', count: 0, level: 0, weekday: 0 },
      { date: '2026-06-08', count: 3, level: 4, weekday: 1 },
      { date: '2026-06-09', count: 0, level: 0, weekday: 2 },
      { date: '2026-06-10', count: 0, level: 0, weekday: 3 },
      { date: '2026-06-11', count: 0, level: 0, weekday: 4 },
      { date: '2026-06-12', count: 0, level: 0, weekday: 5 },
      { date: '2026-06-13', count: 0, level: 0, weekday: 6 },
    ],
  ],
}

describe('Heatmap', () => {
  it('renders 7 rows and labels cells', () => {
    render(<Heatmap model={model} />)
    expect(screen.getAllByRole('row')).toHaveLength(7)
    expect(screen.getByRole('img', { name: '3 problems on 2026-06-08' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'No practice on 2026-06-07' })).toBeInTheDocument()
  })
})
