import { useGuided } from './useGuided'
import { WeekdayPicker } from '../../components/WeekdayPicker'
import { StepTrace } from '../../components/StepTrace'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SolveScreen } from '../../components/SolveScreen'
import { formatDate, weekdayName } from '../../lib/format'
import { explain, type Weekday } from '../../engine'
import { useSettings } from '../../store/settings'
import { unlockAudio, playFeedback } from '../../feedback/feedback'

const PROMPTS = ['Century anchor?', "Year's doomsday?", 'The weekday?']

function PickRow({
  label,
  value,
  truth,
}: {
  label: string
  value?: Weekday
  truth: Weekday
}) {
  // Each row reveals its own ✓/✕ the instant it has a value, comparing that
  // pick to its engine truth — so a wrong intermediate step turns red before
  // the next prompt renders, instead of waiting for the final summary.
  const show = value !== undefined
  const ok = value === truth
  const color = !show ? 'var(--muted)' : ok ? 'var(--green)' : 'var(--burg)'
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
        {show ? `${weekdayName(value)}${ok ? ' ✓' : ' ✕'}` : '—'}
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
  // Per-step truth for the active prompt: century anchor, year's doomsday, weekday.
  const stepTruth: Weekday[] = [trace.centuryAnchor, trace.yearDoomsday, trace.result]

  function onPick(w: Weekday) {
    // Flag every step the moment it's answered (steps 0, 1, 2), not just the
    // final pick — so the chime/haptic reflects that specific step's correctness.
    unlockAudio()
    playFeedback(w === stepTruth[step], { sound: soundEnabled })
    pick(w)
  }

  return (
    <SolveScreen
      className="screen"
      footerPadTop={20}
      footer={
        <>
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
              <PrimaryButton onClick={next}>Next →</PrimaryButton>
            </>
          )}
        </>
      }
    >
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <div className="muted" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Guided solve
        </div>
        <div className="serif" style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>
          {formatDate(problem.year, problem.month, problem.day)}
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
        <PickRow label="Century anchor" value={picks.century} truth={trace.centuryAnchor} />
        <PickRow label="Year's doomsday" value={picks.yearDoom} truth={trace.yearDoomsday} />
        <PickRow label="Weekday" value={picks.final} truth={trace.result} />
      </div>
    </SolveScreen>
  )
}
