import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LevelsScreen } from './LevelsScreen'
import { _resetDbForTests } from '../../db/db'
import { setMeta } from '../../db/meta'

describe('LevelsScreen', () => {
  beforeEach(async () => {
    // Await the close, then the delete, so a prior test's meta writes can't
    // leak into the next test (the un-awaited form races, per _resetDbForTests).
    await _resetDbForTests()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('daycipher')
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })

  it('offers the Level 1 test at base level', async () => {
    render(
      <MemoryRouter>
        <LevelsScreen />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByRole('button', { name: /Take the Level 1 test/ })).toBeInTheDocument())
  })

  it('shows "Full range unlocked" at the top level', async () => {
    await setMeta('unlockedLevel', 2)
    render(
      <MemoryRouter>
        <LevelsScreen />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText(/Full range unlocked/)).toBeInTheDocument())
  })

  it('opens the speed challenge', async () => {
    render(
      <MemoryRouter>
        <LevelsScreen />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByRole('button', { name: /Speed challenge/ })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Speed challenge/ }))
    expect(screen.getByRole('heading', { name: /Speed \(Ao5\)/ })).toBeInTheDocument()
  })
})
