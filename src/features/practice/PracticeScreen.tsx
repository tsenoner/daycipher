import { useEffect, useState } from 'react'
import { QuickDrill } from './QuickDrill'
import { GuidedSolve } from './GuidedSolve'
import { Speedrun } from './Speedrun'
import { PracticeLocked } from './PracticeLocked'
import { LevelsCard } from '../levels/LevelsCard'
import { getCompleted, getPracticeUnlocked, isPracticeUnlocked } from '../learn/learnGate'
import { DEV_UNLOCK_ALL } from '../../lib/devFlags'

type Mode = 'quick' | 'guided' | 'speed'
const LABELS: Record<Mode, string> = { quick: 'Quick', guided: 'Guided', speed: 'Speedrun' }

export function PracticeScreen() {
  const [mode, setMode] = useState<Mode>('quick')
  // null while loading — avoids flashing either the tabs or the locked screen.
  const [completed, setCompleted] = useState<string[] | null>(null)
  const [practiceUnlocked, setPracticeUnlocked] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([getCompleted(), getPracticeUnlocked()]).then(([c, u]) => {
      if (active) {
        setCompleted(c)
        setPracticeUnlocked(u)
      }
    })
    return () => {
      active = false
    }
  }, [])

  if (completed === null) {
    return <div className="screen" />
  }

  if (!DEV_UNLOCK_ALL && !isPracticeUnlocked(completed, practiceUnlocked)) {
    return (
      <div className="screen">
        <PracticeLocked completed={completed} />
      </div>
    )
  }

  return (
    <div>
      <LevelsCard />
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
        {(['quick', 'guided', 'speed'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 10,
              border: `1px solid ${mode === m ? 'var(--burg)' : 'var(--line)'}`,
              background: mode === m ? 'var(--burg)' : 'var(--card)',
              color: mode === m ? '#fff' : 'var(--ink)',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>
      {mode === 'quick' ? <QuickDrill /> : mode === 'guided' ? <GuidedSolve /> : <Speedrun />}
    </div>
  )
}
