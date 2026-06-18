import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProgressScreen } from './ProgressScreen'
import { _resetDbForTests, type Attempt } from '../../db/db'
import { addAttempt } from '../../db/attempts'
import { setMeta } from '../../db/meta'

const base = {
  timestamp: 1,
  targetDate: '1986-03-14',
  correctWeekday: 5,
  guessedWeekday: 5,
  correct: true,
  durationMs: 4200,
  anchorCorrect: null,
  yearDoomCorrect: null,
  offsetCorrect: null,
  timed: false,
} as const
const mk = (mode: string): Attempt => ({ ...base, mode })

describe('ProgressScreen', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })
  it('empty state links to Learn while Practice is locked', async () => {
    render(
      <MemoryRouter>
        <ProgressScreen />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/No drills yet/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Start learning/ })
    expect(link).toHaveAttribute('href', '/learn')
  })
  it('empty state links to Practice once it is unlocked', async () => {
    await setMeta('practiceUnlocked', true)
    render(
      <MemoryRouter>
        <ProgressScreen />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/No drills yet/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Start drilling/ })
    expect(link).toHaveAttribute('href', '/practice')
  })
  it('shows the onboarding card (not zeroed stats) for a learn-only user', async () => {
    await addAttempt(mk('learn:mod7'))
    render(
      <MemoryRouter>
        <ProgressScreen />
      </MemoryRouter>,
    )
    // Empty-state card, because there are no practice attempts to summarize.
    expect(await screen.findByText(/No drills yet/)).toBeInTheDocument()
    // The zeroed stats tiles must NOT render.
    expect(screen.queryByText('solved')).not.toBeInTheDocument()
    expect(screen.queryByText('accuracy')).not.toBeInTheDocument()
  })
  it('renders the full stats view once there is a practice attempt', async () => {
    await addAttempt(mk('learn:mod7'))
    await addAttempt(mk('quick'))
    render(
      <MemoryRouter>
        <ProgressScreen />
      </MemoryRouter>,
    )
    // Stats tiles render; the empty-state card does not.
    expect(await screen.findByText('solved')).toBeInTheDocument()
    expect(screen.getByText('accuracy')).toBeInTheDocument()
    expect(screen.queryByText(/No drills yet/)).not.toBeInTheDocument()
  })
})
