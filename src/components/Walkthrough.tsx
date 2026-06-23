import { useState } from 'react'
import { WorkedExampleCard } from './WorkedExample'
import { walkthroughFor } from '../features/learn/workedExample'

/**
 * Opt-in "Walk me through it" deep-dive for a drilled date: a toggle that reveals
 * the full engine-derived mnemonic walkthrough (century anchor → Odd+11 → month
 * anchor → cast-out-sevens) for the EXACT date just answered. Shown after a wrong
 * answer in Quick Drill / Guided Solve, alongside (not replacing) the StepTrace.
 */
export function Walkthrough({ year, month, day }: { year: number; month: number; day: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          background: 'none',
          border: 0,
          padding: 0,
          color: 'var(--burg)',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {open ? 'Hide walkthrough' : 'Walk me through it →'}
      </button>
      {open &&
        (() => {
          const w = walkthroughFor(year, month, day)
          return <WorkedExampleCard date={w.date} steps={w.steps} answer={w.answer} />
        })()}
    </div>
  )
}
