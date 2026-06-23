import { useSpeedrun } from './useSpeedrun'
import { WeekdayPicker } from '../../components/WeekdayPicker'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SolveScreen } from '../../components/SolveScreen'
import { formatDate } from '../../lib/format'
import { useSettings } from '../../store/settings'
import { unlockAudio } from '../../feedback/feedback'
import type { Weekday } from '../../engine'

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
        <PrimaryButton
          onClick={() => {
            unlockAudio()
            start()
          }}
        >
          Start
        </PrimaryButton>
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
        <PrimaryButton onClick={start}>Play again</PrimaryButton>
      </div>
    )
  }

  return (
    <SolveScreen
      className="screen"
      minHeight="100%"
      footer={<WeekdayPicker weekStart={weekStart} graded={false} onPick={(w: Weekday) => answer(w)} />}
    >
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
    </SolveScreen>
  )
}
