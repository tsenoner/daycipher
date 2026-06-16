import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { App } from './App'
import { TodayScreen } from './features/today/TodayScreen'

describe('App shell', () => {
  it('renders the Today screen and primary nav', () => {
    const router = createMemoryRouter(
      [{ path: '/', element: <App />, children: [{ index: true, element: <TodayScreen /> }] }],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Quick Drill/ })).toBeInTheDocument()
  })
})
