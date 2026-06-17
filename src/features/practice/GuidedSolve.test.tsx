import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GuidedSolve } from './GuidedSolve'
import { explain, WEEKDAY_NAMES } from '../../engine'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

describe('GuidedSolve', () => {
  it('captures three steps and grades correctly', async () => {
    render(<GuidedSolve />)
    const dateEl = screen.getByText(/^\d+ \w+ \d{4}$/)
    const [d, mo, y] = dateEl.textContent!.split(' ')
    const t = explain(Number(y), MONTHS.indexOf(mo) + 1, Number(d))

    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[t.centuryAnchor] }))
    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[t.yearDoomsday] }))
    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[t.result] }))

    expect(screen.getByRole('status')).toHaveTextContent(/Correct/)
    expect(screen.getByText('How it works')).toBeInTheDocument()
  })
})
