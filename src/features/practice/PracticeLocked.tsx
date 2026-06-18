import { Link } from 'react-router-dom'
import { CURRICULUM } from '../learn/curriculum'
import { nextStageId } from '../learn/learnGate'

interface PracticeLockedProps {
  completed: string[]
}

/**
 * Locked-state placeholder for /practice (R4): no drill mounted. Shows how far
 * the learner has progressed and a CTA back into the next lesson.
 */
export function PracticeLocked({ completed }: PracticeLockedProps) {
  const next = nextStageId(completed)
  const to = `/learn/${next ?? ''}`
  const cta = completed.length === 0 ? 'Start learning →' : 'Continue learning →'

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: 16,
      }}
    >
      <div className="serif" style={{ fontSize: 20, fontWeight: 600 }}>
        Practice unlocks as you learn
      </div>
      <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
        {completed.length} / {CURRICULUM.length} stages internalized
      </div>
      <Link
        to={to}
        style={{
          display: 'inline-block',
          marginTop: 12,
          color: 'var(--burg)',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        {cta}
      </Link>
    </div>
  )
}
