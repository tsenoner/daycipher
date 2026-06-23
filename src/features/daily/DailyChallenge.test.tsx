import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { DailyChallenge } from './DailyChallenge'
import { weekdayOfYMD, WEEKDAY_NAMES } from '../../engine'
import { resetTestDb } from '../../test/resetDb'

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

describe('DailyChallenge', () => {
  beforeEach(resetTestDb)
  it('runs the 5-date challenge to a perfect score', async () => {
    render(
      <MemoryRouter>
        <DailyChallenge />
      </MemoryRouter>,
    )
    for (let i = 0; i < 5; i++) {
      const dateEl = await screen.findByText(/^\d+ \w+ \d{4}$/)
      const [d, mo, y] = dateEl.textContent!.split(' ')
      const correct = weekdayOfYMD(Number(y), MONTHS.indexOf(mo) + 1, Number(d))
      await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[correct] }))
    }
    expect(await screen.findByText('5 / 5')).toBeInTheDocument()
  })
})
