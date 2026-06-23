import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TodayScreen } from './TodayScreen'
import { resetTestDb } from '../../test/resetDb'
import { setMeta } from '../../db/meta'

function renderScreen() {
  render(
    <MemoryRouter>
      <TodayScreen />
    </MemoryRouter>,
  )
}

describe('TodayScreen', () => {
  beforeEach(resetTestDb)

  it("shows this year's doomsday and, while locked, a Continue learning CTA", async () => {
    renderScreen()
    expect(screen.getByText(/This year's doomsday:/)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: /Continue learning/ })).toHaveAttribute(
      'href',
      '/learn',
    )
  })

  it('shows a Quick Drill CTA once Practice is unlocked', async () => {
    await setMeta('practiceUnlocked', true)
    renderScreen()
    expect(await screen.findByRole('link', { name: /Quick Drill/ })).toHaveAttribute(
      'href',
      '/practice',
    )
  })
})
