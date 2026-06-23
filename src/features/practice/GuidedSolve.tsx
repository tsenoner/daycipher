import { useGuided } from './useGuided'
import { WeekdayPicker } from '../../components/WeekdayPicker'
import { NumberPad } from '../../components/NumberPad'
import { StepTrace } from '../../components/StepTrace'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SolveScreen } from '../../components/SolveScreen'
import { ANCHOR_DAYS } from '../learn/lessonGen'
import { formatDate, weekdayName } from '../../lib/format'
import { explain, type Weekday } from '../../engine'
import { useSettings } from '../../store/settings'
import { unlockAudio, playFeedback } from '../../feedback/feedback'

// One prompt per step: century anchor, year's doomsday, month anchor (a date),
// then the final weekday. The month-anchor prompt names "date" because its
// weekday is the year's doomsday already picked.
const PROMPTS = ['Century anchor?', "Year's doomsday?", 'Month anchor — which date?', 'The weekday?']

function PickRow({
  label,
  value,
  truth,
  format,
}: {
  label: string
  value?: number
  truth: number
  format: (n: number) => string
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
        {show ? `${format(value)}${ok ? ' ✓' : ' ✕'}` : '—'}
      </span>
    </div>
  )
}

export function GuidedSolve() {
  const { problem, step, picks, attempt, pick, pickAnchor, next } = useGuided()
  const weekStart = useSettings((s) => s.weekStart)
  const soundEnabled = useSettings((s) => s.soundEnabled)
  const graded = step === 4
  const trace = explain(problem.year, problem.month, problem.day)
  const wd = (n: number) => weekdayName(n as Weekday) // row values are numbers; weekday rows hold 0..6
  // Per-step weekday truth for the active prompt (the month-anchor step 2 is a
  // number, handled separately): century anchor, year's doomsday, _, final.
  const weekdayTruth: Record<number, Weekday> = {
    0: trace.centuryAnchor,
    1: trace.yearDoomsday,
    3: trace.result,
  }

  function onPick(w: Weekday) {
    // Flag every step the moment it's answered, not just the final pick — so the
    // chime/haptic reflects that specific step's correctness.
    unlockAudio()
    playFeedback(w === weekdayTruth[step], { sound: soundEnabled })
    pick(w)
  }

  function onPickAnchor(n: number) {
    unlockAudio()
    playFeedback(n === trace.monthAnchorDay, { sound: soundEnabled })
    pickAnchor(n)
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
              {step === 2 ? (
                <NumberPad options={ANCHOR_DAYS} graded={false} onPick={onPickAnchor} />
              ) : (
                <WeekdayPicker weekStart={weekStart} graded={false} onPick={onPick} />
              )}
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
        <PickRow label="Century anchor" value={picks.century} truth={trace.centuryAnchor} format={wd} />
        <PickRow label="Year's doomsday" value={picks.yearDoom} truth={trace.yearDoomsday} format={wd} />
        <PickRow
          label="Month anchor"
          value={picks.monthAnchorDay}
          truth={trace.monthAnchorDay}
          format={(n) => `the ${n}th`}
        />
        <PickRow label="Weekday" value={picks.final} truth={trace.result} format={wd} />
      </div>
    </SolveScreen>
  )
}
