import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PracticeScreen } from './PracticeScreen'
import { weekdayOfYMD, WEEKDAY_NAMES } from '../../engine'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

describe('PracticeScreen drill loop', () => {
  it('grades a correct answer, reveals reasoning, then advances', async () => {
    render(<PracticeScreen />)
    const dateEl = screen.getByText(/^\d+ \w+ \d{4}$/)
    const [dayStr, monthStr, yearStr] = dateEl.textContent!.split(' ')
    const correct = weekdayOfYMD(Number(yearStr), MONTHS.indexOf(monthStr) + 1, Number(dayStr))

    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[correct] }))

    expect(screen.getByRole('status')).toHaveTextContent(/Correct/)
    expect(screen.getByText('How it works')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next →' }))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
