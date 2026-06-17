import { useState } from 'react'
import { QuickDrill } from './QuickDrill'
import { GuidedSolve } from './GuidedSolve'
import { Speedrun } from './Speedrun'

type Mode = 'quick' | 'guided' | 'speed'
const LABELS: Record<Mode, string> = { quick: 'Quick', guided: 'Guided', speed: 'Speedrun' }

export function PracticeScreen() {
  const [mode, setMode] = useState<Mode>('quick')
  return (
    <div>
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
