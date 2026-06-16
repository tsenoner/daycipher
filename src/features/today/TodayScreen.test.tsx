import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TodayScreen } from './TodayScreen'

describe('TodayScreen', () => {
  it("shows this year's doomsday and a Quick Drill link", () => {
    render(
      <MemoryRouter>
        <TodayScreen />
      </MemoryRouter>,
    )
    expect(screen.getByText(/This year's doomsday:/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Quick Drill/ })).toHaveAttribute('href', '/practice')
  })
})
