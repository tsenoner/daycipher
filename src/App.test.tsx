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

  it('insets the header top padding for the iOS status-bar safe area', () => {
    // Regression guard for the iOS PWA notch overlap: the header must add
    // env(safe-area-inset-top) to its top padding so the wordmark clears the
    // status-bar clock. jsdom does not compute env(), so we assert the raw
    // inline style string carries the inset rather than a pixel value.
    const router = createMemoryRouter(
      [{ path: '/', element: <App />, children: [{ index: true, element: <TodayScreen /> }] }],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    const header = screen.getByRole('banner')
    expect(header).toHaveStyle({
      padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px',
    })
  })

  it('pins the bottom nav structurally instead of position: fixed', () => {
    // Regression guard: the tab bar must be a flex child of the shell (scroll lives in
    // .app-main), not position: fixed over a body scroll — which visibly jumps on iOS
    // when switching screens. jsdom can't compute layout, so assert the contract:
    // a scrollable <main> wraps the routed screen and the nav is not position: fixed.
    const router = createMemoryRouter(
      [{ path: '/', element: <App />, children: [{ index: true, element: <TodayScreen /> }] }],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)
    const main = screen.getByRole('main')
    expect(main).toHaveClass('app-main')
    expect(screen.getByRole('navigation', { name: 'Primary' })).not.toHaveStyle({
      position: 'fixed',
    })
  })
})
