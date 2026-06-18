import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { _resetDbForTests } from '../db/db'
import { setMeta } from '../db/meta'

/** The Practice NavLink, found by its label regardless of the trailing lock glyph. */
function practiceLink(): HTMLAnchorElement {
  return screen.getByRole('link', { name: /Practice/ }) as HTMLAnchorElement
}

describe('BottomNav', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })

  it('shows the Practice lock glyph on a fresh (gated) install', async () => {
    render(
      <MemoryRouter initialEntries={['/practice']}>
        <BottomNav />
      </MemoryRouter>,
    )
    await waitFor(() => expect(practiceLink()).toHaveTextContent('🔒'))
  })

  it('clears a stale lock glyph after navigation once Practice is unlocked', async () => {
    // Persistent sibling of the Outlet: it mounts locked, then the user unlocks
    // mid-session. Re-reading on route change is what clears the stale glyph.
    render(
      <MemoryRouter initialEntries={['/practice']}>
        <BottomNav />
      </MemoryRouter>,
    )
    await waitFor(() => expect(practiceLink()).toHaveTextContent('🔒'))

    await setMeta('practiceUnlocked', true)
    // Navigate (tap Today) so the pathname dep re-fires the lock read.
    await userEvent.click(screen.getByRole('link', { name: 'Today' }))

    await waitFor(() => expect(practiceLink()).not.toHaveTextContent('🔒'))
  })
})
