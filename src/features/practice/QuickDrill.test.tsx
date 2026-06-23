import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickDrill } from './QuickDrill'
import { explain, WEEKDAY_NAMES, weekdayOfYMD, type Weekday } from '../../engine'
import { resetTestDb } from '../../test/resetDb'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Read the rendered problem date (AD or "N BC") into a y/m/d the engine can solve. */
function readShownDate() {
  const el = screen.getByText(/^\d+ \w+ \d+( BC)?$/)
  const parts = el.textContent!.split(' ')
  const [d, mo, y] = parts
  const isBC = parts[parts.length - 1] === 'BC'
  return { year: isBC ? 1 - Number(y) : Number(y), month: MONTHS.indexOf(mo) + 1, day: Number(d) }
}

const wrong = (w: Weekday): Weekday => ((w + 1) % 7) as Weekday

describe('QuickDrill — Walk me through it (#11)', () => {
  beforeEach(resetTestDb)

  it('reveals a walkthrough for the missed date after a wrong answer, matching the engine', async () => {
    render(<QuickDrill />)
    const { year, month, day } = readShownDate()
    await userEvent.click(
      screen.getByRole('button', { name: WEEKDAY_NAMES[wrong(weekdayOfYMD(year, month, day))] }),
    )

    const btn = await screen.findByRole('button', { name: /Walk me through it/ })
    await userEvent.click(btn)

    const t = explain(year, month, day)
    // "cast out sevens" appears only in the walkthrough card; the answer div's full
    // text is exactly "→ <weekday>" (an exact match avoids the offset step's
    // "... + N → <weekday>" line), confirming the card matches the engine result.
    expect(screen.getByText(/cast out sevens/i)).toBeInTheDocument()
    expect(screen.getByText(`→ ${WEEKDAY_NAMES[t.result]}`)).toBeInTheDocument()
  })

  it('does not offer the walkthrough after a correct answer', async () => {
    render(<QuickDrill />)
    const { year, month, day } = readShownDate()
    await userEvent.click(
      screen.getByRole('button', { name: WEEKDAY_NAMES[weekdayOfYMD(year, month, day)] }),
    )
    expect(screen.queryByRole('button', { name: /Walk me through it/ })).toBeNull()
  })
})
