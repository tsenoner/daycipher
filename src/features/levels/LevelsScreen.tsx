import { useEffect, useState } from 'react'
import { WeekdayPicker } from '../../components/WeekdayPicker'
import { formatDate } from '../../lib/format'
import { useSettings } from '../../store/settings'
import { unlockAudio } from '../../feedback/feedback'
import { getMeta } from '../../db/meta'
import { type Weekday } from '../../engine'
import { LEVELS, clampLevel, nextTakeableLevel } from './levels'
import { useLevelTest } from './useLevelTest'

const btn = {
  marginTop: 16,
  width: '100%',
  minHeight: 'var(--tap)',
  border: 0,
  borderRadius: 12,
  background: 'var(--burg)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 16,
} as const

function LevelTest({ target, onDone }: { target: number; onDone: () => void }) {
  const { problem, index, total, correctCount, phase, guessed, attempt, passed, answer, next } =
    useLevelTest(target)
  const weekStart = useSettings((s) => s.weekStart)

  if (phase === 'done') {
    return (
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <div className="serif" style={{ fontSize: 28, fontWeight: 600 }}>
          {passed ? `Unlocked: ${LEVELS[target].label} 🎉` : `${correctCount}/${total} — not yet`}
        </div>
        <p className="muted">{passed ? 'New range added to Practice.' : 'Need 9 of 10. Try again.'}</p>
        <button type="button" style={btn} onClick={onDone}>
          {passed ? 'Done' : 'Back'}
        </button>
      </div>
    )
  }

  const onPick = (w: Weekday) => {
    if (phase !== 'answering') return
    unlockAudio()
    answer(w) // grading + ✓/✕ reveal is handled by WeekdayPicker via `attempt`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
        <span className="tabnums">
          {index + 1}/{total}
        </span>
        <span className="tabnums">✓ {correctCount}</span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <div className="serif" style={{ fontSize: 28, fontWeight: 600 }}>
          {formatDate(problem.year, problem.month, problem.day)}
        </div>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        <WeekdayPicker
          weekStart={weekStart}
          graded={phase === 'graded'}
          guessed={guessed}
          correct={(attempt?.correctWeekday ?? null) as Weekday | null}
          onPick={onPick}
        />
        {phase === 'graded' && (
          <button type="button" style={btn} onClick={next}>
            {index + 1 >= total ? 'See result →' : 'Next →'}
          </button>
        )}
      </div>
    </div>
  )
}

export function LevelsScreen() {
  const [level, setLevel] = useState(0)
  const [testing, setTesting] = useState<number | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    void getMeta<number>('unlockedLevel', 0).then((l) => {
      if (active) setLevel(clampLevel(l))
    })
    return () => {
      active = false
    }
  }, [reloadKey])

  if (testing !== null) {
    return (
      <div className="screen">
        <LevelTest
          target={testing}
          onDone={() => {
            setTesting(null)
            setReloadKey((k) => k + 1)
          }}
        />
      </div>
    )
  }

  const takeable = nextTakeableLevel(level)
  return (
    <div className="screen">
      <h1>Levels</h1>
      <p className="muted">Widen the years you practice. Pass a Level test (9/10) to unlock the next range.</p>
      <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {LEVELS.map((def, i) => {
          const unlocked = i <= level
          return (
            <li
              key={def.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${i === level ? 'var(--burg)' : 'var(--line)'}`,
                background: 'var(--card)',
                opacity: unlocked ? 1 : 0.6,
              }}
            >
              <span style={{ fontWeight: 600 }}>
                Level {i}: {def.label}
              </span>
              <span className="muted">{unlocked ? '✓ unlocked' : i === takeable ? 'next' : '🔒'}</span>
            </li>
          )
        })}
      </ol>
      {takeable !== null ? (
        <button type="button" style={btn} onClick={() => setTesting(takeable)}>
          Take the Level {takeable} test →
        </button>
      ) : (
        <p style={{ marginTop: 16, fontWeight: 600 }}>Full range unlocked 🎉</p>
      )}
    </div>
  )
}
