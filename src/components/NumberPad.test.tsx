import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NumberPad } from './NumberPad'

describe('NumberPad', () => {
  it('renders one button per option with its number as accessible name', () => {
    render(<NumberPad options={[0, 1, 2, 3]} graded={false} onPick={() => {}} />)
    const btns = screen.getAllByRole('button')
    expect(btns).toHaveLength(4)
    expect(btns[0]).toHaveAccessibleName('0')
    expect(btns[3]).toHaveAccessibleName('3')
  })
  it('calls onPick with the picked number', async () => {
    const onPick = vi.fn()
    render(<NumberPad options={[3, 4, 5, 6]} graded={false} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: '5' }))
    expect(onPick).toHaveBeenCalledWith(5)
  })
  it('when graded, disables buttons and marks correct/wrong with icons', () => {
    render(<NumberPad options={[3, 4, 5, 6]} graded guessed={4} correct={6} onPick={() => {}} />)
    const six = screen.getByRole('button', { name: '6' })
    const four = screen.getByRole('button', { name: '4' })
    expect(six).toBeDisabled()
    expect(six).toHaveTextContent('✓')
    expect(four).toHaveTextContent('✕')
  })
})
