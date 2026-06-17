import { useDrill } from './useDrill'
import { WeekdayPicker } from '../../components/WeekdayPicker'
import { StepTrace } from '../../components/StepTrace'
import { formatDate, weekdayName } from '../../lib/format'
import { weekdayOfYMD, explain, type Weekday } from '../../engine'
import { useSettings } from '../../store/settings'
import { unlockAudio, playFeedback } from '../../feedback/feedback'

export function QuickDrill() {
  const { problem, phase, guessed, attempt, answer, next } = useDrill()
  const weekStart = useSettings((s) => s.weekStart)
  const soundEnabled = useSettings((s) => s.soundEnabled)

  const correctWeekday = weekdayOfYMD(problem.year, problem.month, problem.day)
  const graded = phase === 'graded'

  function onPick(w: Weekday) {
    unlockAudio()
    playFeedback(w === correctWeekday, { sound: soundEnabled })
    answer(w)
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', minHeight: '70vh' }}>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <div
          className="muted"
          style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}
        >
          What weekday?
        </div>
        <div className="serif" style={{ fontSize: 30, fontWeight: 600, marginTop: 6 }}>
          {formatDate(problem.year, problem.month, problem.day)}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        {graded && attempt && (
          <p
            role="status"
            style={{
              textAlign: 'center',
              fontWeight: 700,
              color: attempt.correct ? 'var(--green)' : 'var(--burg)',
            }}
          >
            {attempt.correct
              ? `✓ Correct — ${weekdayName(correctWeekday)} · ${(attempt.durationMs / 1000).toFixed(1)}s`
              : `✕ Not quite — it's ${weekdayName(correctWeekday)}`}
          </p>
        )}

        <WeekdayPicker
          weekStart={weekStart}
          graded={graded}
          guessed={guessed}
          correct={graded ? correctWeekday : null}
          onPick={onPick}
        />

        {graded && (
          <StepTrace
            trace={explain(problem.year, problem.month, problem.day)}
            defaultOpen={!attempt?.correct}
          />
        )}

        {graded && (
          <button
            type="button"
            onClick={next}
            style={{
              marginTop: 16,
              width: '100%',
              minHeight: 'var(--tap)',
              border: 0,
              borderRadius: 12,
              background: 'var(--burg)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
