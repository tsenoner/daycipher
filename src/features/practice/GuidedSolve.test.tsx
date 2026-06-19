import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GuidedSolve } from './GuidedSolve'
import { explain, WEEKDAY_NAMES, type Weekday } from '../../engine'
import { playFeedback } from '../../feedback/feedback'

vi.mock('../../feedback/feedback', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../feedback/feedback')>()
  return { ...actual, playFeedback: vi.fn(), unlockAudio: vi.fn() }
})

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Read the rendered date and resolve the engine truth for the shown problem.
 * Handles both AD ("4 April 1933") and BC ("4 April 100 BC") rendering, where
 * a "N BC" label maps to the astronomical year 1 - N.
 */
function readTruth() {
  const dateEl = screen.getByText(/^\d+ \w+ \d+( BC)?$/)
  const parts = dateEl.textContent!.split(' ')
  const [d, mo, y] = parts
  const isBC = parts[parts.length - 1] === 'BC'
  const year = isBC ? 1 - Number(y) : Number(y)
  return explain(year, MONTHS.indexOf(mo) + 1, Number(d))
}

/** Find the value cell of the row whose label matches. */
function rowValue(label: string): string {
  const labelEl = screen.getByText(label)
  const row = labelEl.parentElement!
  // The value span is the last child of the row.
  return row.lastElementChild!.textContent ?? ''
}

const wrong = (w: Weekday): Weekday => ((w + 1) % 7) as Weekday

describe('GuidedSolve', () => {
  beforeEach(() => {
    vi.mocked(playFeedback).mockClear()
  })

  it('captures three steps and grades correctly', async () => {
    render(<GuidedSolve />)
    const t = readTruth()

    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[t.centuryAnchor] }))
    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[t.yearDoomsday] }))
    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[t.result] }))

    expect(screen.getByRole('status')).toHaveTextContent(/Correct/)
    expect(screen.getByText('How it works')).toBeInTheDocument()
  })

  it('immediately flags a wrong century anchor with ✕ before the next step is answered', async () => {
    render(<GuidedSolve />)
    const t = readTruth()
    const bad = wrong(t.centuryAnchor)

    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[bad] }))

    // We are now on the year's-doomsday prompt, but the century row already shows ✕.
    expect(screen.getByText("Year's doomsday?")).toBeInTheDocument()
    expect(rowValue('Century anchor')).toContain('✕')
    expect(rowValue('Century anchor')).toContain(WEEKDAY_NAMES[bad])
  })

  it('immediately flags a correct century anchor with ✓ before completing the solve', async () => {
    render(<GuidedSolve />)
    const t = readTruth()

    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[t.centuryAnchor] }))

    expect(screen.getByText("Year's doomsday?")).toBeInTheDocument()
    expect(rowValue('Century anchor')).toContain('✓')
  })

  it("flags the year's-doomsday step independently right after its pick", async () => {
    render(<GuidedSolve />)
    const t = readTruth()

    // Correct century anchor, then a wrong year's doomsday.
    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[t.centuryAnchor] }))
    const badYear = wrong(t.yearDoomsday)
    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[badYear] }))

    // Now on the final weekday prompt; the doomsday row shows ✕ while century still shows ✓.
    expect(screen.getByText('The weekday?')).toBeInTheDocument()
    expect(rowValue('Century anchor')).toContain('✓')
    expect(rowValue("Year's doomsday")).toContain('✕')
  })

  it('fires playFeedback on every step with that step’s correctness', async () => {
    render(<GuidedSolve />)
    const t = readTruth()

    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[wrong(t.centuryAnchor)] }))
    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[t.yearDoomsday] }))
    await userEvent.click(screen.getByRole('button', { name: WEEKDAY_NAMES[t.result] }))

    expect(playFeedback).toHaveBeenCalledTimes(3)
    // Step 0 wrong, steps 1 & 2 correct.
    expect(vi.mocked(playFeedback).mock.calls[0][0]).toBe(false)
    expect(vi.mocked(playFeedback).mock.calls[1][0]).toBe(true)
    expect(vi.mocked(playFeedback).mock.calls[2][0]).toBe(true)
  })
})
