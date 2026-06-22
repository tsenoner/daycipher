import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LevelsScreen } from './LevelsScreen'
import { _resetDbForTests } from '../../db/db'
import { setMeta } from '../../db/meta'

describe('LevelsScreen', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
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
})
