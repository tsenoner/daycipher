import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { PracticeScreen } from './PracticeScreen'
import { weekdayOfYMD, WEEKDAY_NAMES } from '../../engine'
import { _resetDbForTests } from '../../db/db'
import { setMeta } from '../../db/meta'

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

function renderScreen() {
  render(
    <MemoryRouter>
      <PracticeScreen />
    </MemoryRouter>,
  )
}

describe('PracticeScreen', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })

  it('renders the locked screen on a fresh (gated) install', async () => {
    renderScreen()
    expect(await screen.findByText(/stages internalized/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quick' })).toBeNull()
  })

  it('renders the quick/guided/speed tabs once Practice is unlocked', async () => {
    await setMeta('practiceUnlocked', true)
    renderScreen()
    expect(await screen.findByRole('button', { name: 'Quick' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guided' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Speedrun' })).toBeInTheDocument()
  })

  it('grades a correct answer, reveals reasoning, then advances', async () => {
    await setMeta('practiceUnlocked', true)
    renderScreen()
    const dateEl = await screen.findByText(/^\d+ \w+ \d{4}$/)
    const [dayStr, monthStr, yearStr] = dateEl.textContent!.split(' ')
    const correct = weekdayOfYMD(Number(yearStr), MONTHS.indexOf(monthStr) + 1, Number(dayStr))

    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[correct] }))

    expect(screen.getByRole('status')).toHaveTextContent(/Correct/)
    expect(screen.getByText('How it works')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next →' }))
    expect(screen.queryByRole('status')).toBeNull()
  })
})
