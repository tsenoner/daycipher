import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { LessonScreen } from './LessonScreen'

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '/learn/:stageId', element: <LessonScreen /> }], {
    initialEntries: [path],
  })
  render(<RouterProvider router={router} />)
}

describe('LessonScreen', () => {
  it('renders a known stage', () => {
    renderAt('/learn/full')
    expect(screen.getByRole('heading', { name: 'Any date, end to end' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mark complete/ })).toBeInTheDocument()
  })
  it('handles an unknown stage', () => {
    renderAt('/learn/nope')
    expect(screen.getByText('Lesson not found.')).toBeInTheDocument()
  })
})
