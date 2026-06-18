import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PracticeLocked } from './PracticeLocked'
import { CURRICULUM } from '../learn/curriculum'

function renderWith(completed: string[]) {
  render(
    <MemoryRouter>
      <PracticeLocked completed={completed} />
    </MemoryRouter>,
  )
}

describe('PracticeLocked', () => {
  it('shows the internalized count out of 7', () => {
    renderWith([CURRICULUM[0].id, CURRICULUM[1].id])
    expect(screen.getByText(`2 / ${CURRICULUM.length} stages internalized`)).toBeInTheDocument()
  })

  it('links the CTA to the next not-yet-completed stage lesson', () => {
    renderWith([CURRICULUM[0].id])
    const cta = screen.getByRole('link', { name: /Continue learning/ })
    expect(cta).toHaveAttribute('href', `/learn/${CURRICULUM[1].id}`)
  })

  it('reads "Start learning" with an empty completed list', () => {
    renderWith([])
    const cta = screen.getByRole('link', { name: /Start learning/ })
    expect(cta).toHaveAttribute('href', `/learn/${CURRICULUM[0].id}`)
  })
})
