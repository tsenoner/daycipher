import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LessonBlocks } from './LessonBlocks'
import type { Block } from '../features/learn/curriculum'
import { CURRENT_YEAR, thisYearDoomsday } from '../engine'
import { weekdayName } from '../lib/format'

const blocks: Block[] = [
  { kind: 'p', text: 'Intro paragraph.' },
  { kind: 'mnemonic', text: 'Remember this rhyme' },
  { kind: 'list', items: ['alpha', 'beta'] },
  { kind: 'example', date: '14 March 1986', steps: ['step one', 'step two'], answer: 'Friday' },
]

describe('LessonBlocks', () => {
  it('renders each block kind', () => {
    render(<LessonBlocks blocks={blocks} stageId="full" />)
    expect(screen.getByText('Intro paragraph.')).toBeInTheDocument()
    expect(screen.getByText(/Remember this rhyme/)).toBeInTheDocument()
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('14 March 1986')).toBeInTheDocument()
    expect(screen.getByText('step one')).toBeInTheDocument()
    expect(screen.getByText(/Friday/)).toBeInTheDocument()
  })

  describe('LessonBlocks token interpolation', () => {
    it('replaces {thisYear} and {thisYearDoomsday} in paragraph text', () => {
      render(<LessonBlocks blocks={[{ kind: 'p', text: 'For {thisYear} it is {thisYearDoomsday}.' }]} stageId="full" />)
      const expected = `For ${CURRENT_YEAR} it is ${weekdayName(thisYearDoomsday())}.`
      expect(screen.getByText(expected)).toBeInTheDocument()
    })
  })
})
