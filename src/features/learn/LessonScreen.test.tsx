import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LessonScreen } from './LessonScreen'
import { resetTestDb } from '../../test/resetDb'

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
  beforeEach(resetTestDb)

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
    // `full` (the last stage) is locked with an empty completed set → redirect, lesson hidden.
    renderAt('/learn/full')
    expect(await screen.findByText('Learn list')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Any date, end to end' })).toBeNull()
  })

  it('leap stage drills with a Yes/No picker after Start exercises', async () => {
    const { markStageComplete } = await import('./learnGate')
    await markStageComplete('mod7')
    renderAt('/learn/leap')
    await screen.findByRole('heading', { name: 'Leap years' })
    await userEvent.click(screen.getByRole('button', { name: /Start exercises/ }))
    expect(await screen.findByRole('group', { name: /yes or no/i })).toBeInTheDocument()
  })

  it('a completed stage offers Practice again instead of Start exercises', async () => {
    const { markStageComplete } = await import('./learnGate')
    await markStageComplete('mod7')
    renderAt('/learn/mod7')
    await screen.findByRole('heading', { name: 'Think in 7s' })
    expect(await screen.findByRole('button', { name: /Practice again/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Start exercises/ })).toBeNull()
  })

  it('Practice again starts an endless drill, not the Internalized screen', async () => {
    const { markStageComplete } = await import('./learnGate')
    await markStageComplete('mod7')
    renderAt('/learn/mod7')
    await userEvent.click(await screen.findByRole('button', { name: /Practice again/ }))
    expect(await screen.findByRole('group', { name: /Choose the number/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Done/ })).toBeInTheDocument()
  })

  it('shows the Practice-unlocked link after finishing the last stage (full)', async () => {
    const { CURRICULUM } = await import('./curriculum')
    const { markStageComplete } = await import('./learnGate')
    const { addAttempt } = await import('../../db/attempts')
    // Unlock `full` (the new last stage) by completing every prior stage, but leave
    // `full` itself out of learnCompleted so the screen offers "Start exercises".
    for (const s of CURRICULUM.slice(0, -1)) await markStageComplete(s.id)
    // Seed the log so the live `full` window is already mastered on load. The drill
    // then loads `done`, latches `full`, and renders the last-stage unlock link.
    for (let i = 0; i < 5; i++) {
      await addAttempt({
        timestamp: i,
        targetDate: '1969-07-20',
        correctWeekday: 0,
        guessedWeekday: 0,
        correct: true,
        durationMs: 999_999,
        mode: 'learn:full',
        anchorCorrect: null,
        yearDoomCorrect: null,
        monthAnchorCorrect: null,
        offsetCorrect: null,
        timed: false,
      })
    }

    renderAt('/learn/full')
    await userEvent.click(await screen.findByRole('button', { name: /Start exercises/ }))

    expect(await screen.findByRole('link', { name: /Practice unlocked/ })).toBeInTheDocument()
  })
})
