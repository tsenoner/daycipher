import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProgressScreen } from './ProgressScreen'
import { _resetDbForTests } from '../../db/db'
import { setMeta } from '../../db/meta'

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
})
