import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeekdayPicker } from './WeekdayPicker'

describe('WeekdayPicker', () => {
  it('renders 7 day buttons, Monday-first', () => {
    render(<WeekdayPicker weekStart={1} graded={false} onPick={() => {}} />)
    const btns = screen.getAllByRole('button')
    expect(btns).toHaveLength(7)
    expect(btns[0]).toHaveAccessibleName('Monday')
    expect(btns[6]).toHaveAccessibleName('Sunday')
  })
  it('calls onPick with the weekday number', async () => {
    const onPick = vi.fn()
    render(<WeekdayPicker weekStart={1} graded={false} onPick={onPick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Friday' }))
    expect(onPick).toHaveBeenCalledWith(5)
  })
  it('when graded, disables buttons and marks correct/wrong with icons', () => {
    render(<WeekdayPicker weekStart={1} graded guessed={3} correct={5} onPick={() => {}} />)
    const fri = screen.getByRole('button', { name: 'Friday' })
    const wed = screen.getByRole('button', { name: 'Wednesday' })
    expect(fri).toBeDisabled()
    expect(fri).toHaveTextContent('✓')
    expect(wed).toHaveTextContent('✕')
  })
})
