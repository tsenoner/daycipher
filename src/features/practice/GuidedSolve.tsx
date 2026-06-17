import { useGuided } from './useGuided'
import { WeekdayPicker } from '../../components/WeekdayPicker'
import { StepTrace } from '../../components/StepTrace'
import { formatDate, weekdayName } from '../../lib/format'
import { explain, type Weekday } from '../../engine'
import { useSettings } from '../../store/settings'
import { unlockAudio, playFeedback } from '../../feedback/feedback'

const PROMPTS = ['Century anchor?', "Year's doomsday?", 'The weekday?']

function PickRow({
  label,
  value,
  truth,
  graded,
}: {
  label: string
  value?: Weekday
  truth: Weekday
  graded: boolean
}) {
  const show = value !== undefined
  const ok = value === truth
  const color = !show ? 'var(--muted)' : graded ? (ok ? 'var(--green)' : 'var(--burg)') : 'var(--ink)'
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--line)',
        paddingBottom: 4,
      }}
    >
      <span className="muted">{label}</span>
      <span style={{ fontWeight: 600, color }}>
        {show ? `${weekdayName(value)}${graded ? (ok ? ' ✓' : ' ✕') : ''}` : '—'}
      </span>
    </div>
  )
}

export function GuidedSolve() {
  const { problem, step, picks, attempt, pick, next } = useGuided()
  const weekStart = useSettings((s) => s.weekStart)
  const soundEnabled = useSettings((s) => s.soundEnabled)
  const graded = step === 3
  const trace = explain(problem.year, problem.month, problem.day)

  function onPick(w: Weekday) {
    if (step === 2) {
      unlockAudio()
      playFeedback(w === trace.result, { sound: soundEnabled })
    }
    pick(w)
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', minHeight: '62vh' }}>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <div className="muted" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Guided solve
        </div>
        <div className="serif" style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>
          {formatDate(problem.year, problem.month, problem.day)}
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
        <PickRow label="Century anchor" value={picks.century} truth={trace.centuryAnchor} graded={graded} />
        <PickRow label="Year's doomsday" value={picks.yearDoom} truth={trace.yearDoomsday} graded={graded} />
        <PickRow label="Weekday" value={picks.final} truth={trace.result} graded={graded} />
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 20 }}>
        {!graded && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>{PROMPTS[step]}</div>
            <WeekdayPicker weekStart={weekStart} graded={false} onPick={onPick} />
          </>
        )}
        {graded && attempt && (
          <>
            <p
              role="status"
              style={{ textAlign: 'center', fontWeight: 700, color: attempt.correct ? 'var(--green)' : 'var(--burg)' }}
            >
              {attempt.correct ? `✓ Correct — ${weekdayName(trace.result)}` : `✕ It's ${weekdayName(trace.result)}`}
            </p>
            <StepTrace trace={trace} defaultOpen />
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
          </>
        )}
      </div>
    </div>
  )
}
