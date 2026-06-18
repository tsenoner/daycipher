import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LessonScreen } from './LessonScreen'
import { _resetDbForTests } from '../../db/db'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/learn" element={<div>Learn list</div>} />
        <Route path="/learn/:stageId" element={<LessonScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LessonScreen', () => {
  beforeEach(() => {
    _resetDbForTests()
    indexedDB.deleteDatabase('daycipher')
  })

  it('renders the first (always unlocked) stage without a Mark complete button', async () => {
    renderAt('/learn/mod7')
    expect(await screen.findByRole('heading', { name: 'Think in 7s' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Mark complete/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /Practice this/ })).toBeNull()
  })

  it('reveals the drill question after Start exercises', async () => {
    renderAt('/learn/mod7')
    await screen.findByRole('heading', { name: 'Think in 7s' })
    await userEvent.click(screen.getByRole('button', { name: /Start exercises/ }))
    // The mod7 drill renders a NumberPad — its option group appears.
    expect(await screen.findByRole('group', { name: /Choose the number/ })).toBeInTheDocument()
  })

  it('handles an unknown stage', async () => {
    renderAt('/learn/nope')
    expect(await screen.findByText('Lesson not found.')).toBeInTheDocument()
  })

  it('redirects away from a locked stage', async () => {
    // `full` (stage 6) is locked with an empty completed set → redirect, lesson hidden.
    renderAt('/learn/full')
    expect(await screen.findByText('Learn list')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Any date, end to end' })).toBeNull()
  })
})
