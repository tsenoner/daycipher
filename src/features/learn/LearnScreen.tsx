import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CURRICULUM } from './curriculum'
import { getDone, isDone } from './learnProgress'
import { isStageUnlocked } from './learnGate'

const cardStyle = {
  display: 'block',
  background: 'var(--card)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius)',
  padding: 14,
  textDecoration: 'none',
  color: 'var(--ink)',
} as const

export function LearnScreen() {
  const [done, setDone] = useState<string[]>([])
  useEffect(() => {
    let active = true
    void getDone().then((d) => {
      if (active) setDone(d)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="screen">
      <h1>Learn</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted">
          {done.length} / {CURRICULUM.length} internalized
        </span>
        <Link
          to="/learn/cheatsheet"
          style={{ color: 'var(--burg)', fontWeight: 600, textDecoration: 'none' }}
        >
          Cheat-sheet →
        </Link>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CURRICULUM.map((s) => {
          const unlocked = isStageUnlocked(s.id, done)
          const stageDone = isDone(s.id, done)

          if (!unlocked) {
            return (
              <div key={s.id} style={{ ...cardStyle, opacity: 0.55 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span className="muted" style={{ fontSize: 12 }}>
                    Stage {s.n}
                  </span>
                  <span aria-hidden>🔒</span>
                </div>
                <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>
                  {s.title}
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  Complete the previous stage to unlock
                </div>
              </div>
            )
          }

          return (
            <Link key={s.id} to={`/learn/${s.id}`} style={cardStyle}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span className="muted" style={{ fontSize: 12 }}>
                  Stage {s.n}
                </span>
                {stageDone && <span style={{ color: 'var(--green)' }}>✓</span>}
              </div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>
                {s.title}
              </div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                {s.goal}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
