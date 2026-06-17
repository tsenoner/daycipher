import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProgressScreen } from './ProgressScreen'
import { _resetDbForTests } from '../../db/db'

describe('ProgressScreen', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })
  it('shows the empty state when there are no attempts', async () => {
    render(
      <MemoryRouter>
        <ProgressScreen />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/No drills yet/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Start drilling/ })).toBeInTheDocument()
  })
})
