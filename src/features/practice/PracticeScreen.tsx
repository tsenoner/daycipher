import { useState } from 'react'
import { QuickDrill } from './QuickDrill'
import { GuidedSolve } from './GuidedSolve'

type Mode = 'quick' | 'guided'

export function PracticeScreen() {
  const [mode, setMode] = useState<Mode>('quick')
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
        {(['quick', 'guided'] as Mode[]).map((m) => (
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
            }}
          >
            {m === 'quick' ? 'Quick Drill' : 'Guided Solve'}
          </button>
        ))}
      </div>
      {mode === 'quick' ? <QuickDrill /> : <GuidedSolve />}
    </div>
  )
}
