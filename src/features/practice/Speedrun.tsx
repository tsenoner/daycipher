import { useSpeedrun } from './useSpeedrun'
import { WeekdayPicker } from '../../components/WeekdayPicker'
import { formatDate } from '../../lib/format'
import { useSettings } from '../../store/settings'
import { unlockAudio } from '../../feedback/feedback'
import type { Weekday } from '../../engine'

const btn = {
  marginTop: 16,
  minHeight: 'var(--tap)',
  width: '100%',
  border: 0,
  borderRadius: 12,
  background: 'var(--burg)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 16,
} as const

export function Speedrun() {
  const { phase, problem, correct, total, timeLeft, best, start, answer } = useSpeedrun()
  const weekStart = useSettings((s) => s.weekStart)

  if (phase === 'ready') {
    return (
      <div className="screen" style={{ textAlign: 'center' }}>
        <h1>Speedrun</h1>
        <p className="muted">How many dates can you solve in 60 seconds?</p>
        <p className="muted">
          Best: <strong>{best}</strong>
        </p>
        <button
          type="button"
          onClick={() => {
            unlockAudio()
            start()
          }}
          style={btn}
        >
          Start
        </button>
      </div>
    )
  }

  if (phase === 'over') {
    return (
      <div className="screen" style={{ textAlign: 'center' }}>
        <h1>Time!</h1>
        <div className="serif" style={{ fontSize: 32, fontWeight: 600 }}>
          {correct} correct
        </div>
        <p className="muted">
          of {total} · best {best}
        </p>
        <button type="button" onClick={start} style={btn}>
          Play again
        </button>
      </div>
    )
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', minHeight: '62vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
        <span className="tabnums">⏱ {timeLeft}s</span>
        <span className="tabnums">
          {correct}/{total}
        </span>
      </div>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <div className="serif" style={{ fontSize: 28, fontWeight: 600 }}>
          {problem && formatDate(problem.year, problem.month, problem.day)}
        </div>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        <WeekdayPicker weekStart={weekStart} graded={false} onPick={(w: Weekday) => answer(w)} />
      </div>
    </div>
  )
}
