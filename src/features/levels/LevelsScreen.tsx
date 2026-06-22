import { useState } from 'react'
import { WeekdayPicker } from '../../components/WeekdayPicker'
import { PrimaryButton, secondaryButtonStyle } from '../../components/PrimaryButton'
import { SolveScreen } from '../../components/SolveScreen'
import { formatDate } from '../../lib/format'
import { useSettings } from '../../store/settings'
import { unlockAudio, playFeedback } from '../../feedback/feedback'
import { weekdayOfYMD, type Weekday } from '../../engine'
import { LEVELS, nextTakeableLevel, TIER_BADGES, TIER_LABELS, type Tier } from './levels'
import { useLevelTest } from './useLevelTest'
import { useUnlockedLevelState } from './useUnlockedLevel'
import { useSpeedChallenge, useSpeedBest } from './useSpeedChallenge'

const formatAo5 = (ms: number) => `${(ms / 1000).toFixed(2)}s`

function LevelTest({ target, onDone }: { target: number; onDone: (unlockedTo: number | null) => void }) {
  const { problem, index, total, correctCount, phase, guessed, passed, answer, next } =
    useLevelTest(target)
  const weekStart = useSettings((s) => s.weekStart)
  const soundEnabled = useSettings((s) => s.soundEnabled)

  if (phase === 'done') {
    return (
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <div className="serif" style={{ fontSize: 28, fontWeight: 600 }}>
          {passed ? `Unlocked: ${LEVELS[target].label} 🎉` : `${correctCount}/${total} — not yet`}
        </div>
        <p className="muted">{passed ? 'New range added to Practice.' : 'Need 9 of 10. Try again.'}</p>
        <PrimaryButton onClick={() => onDone(passed ? target : null)}>
          {passed ? 'Done' : 'Back'}
        </PrimaryButton>
      </div>
    )
  }

  // Computed once and reused by both the feedback chime and the picker reveal,
  // so the component never recomputes the engine result per render.
  const correctWeekday = weekdayOfYMD(problem.year, problem.month, problem.day)
  const onPick = (w: Weekday) => {
    if (phase !== 'answering') return
    unlockAudio()
    playFeedback(w === correctWeekday, { sound: soundEnabled }) // chime/haptic, like QuickDrill
    answer(w) // ✓/✕ reveal is handled by WeekdayPicker once `phase` is graded
  }

  return (
    <SolveScreen
      minHeight="100%"
      footer={
        <>
          <WeekdayPicker
            weekStart={weekStart}
            graded={phase === 'graded'}
            guessed={guessed}
            correct={phase === 'graded' ? correctWeekday : null}
            onPick={onPick}
          />
          {phase === 'graded' && (
            <PrimaryButton onClick={next}>
              {index + 1 >= total ? 'See result →' : 'Next →'}
            </PrimaryButton>
          )}
        </>
      }
    >
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
    </SolveScreen>
  )
}

function SpeedChallenge({ onDone }: { onDone: (earnedTier: Tier, earnedMs: number | null) => void }) {
  const { phase, problem, count, total, result, tier, start, answer } = useSpeedChallenge()
  const weekStart = useSettings((s) => s.weekStart)

  if (phase === 'ready') {
    return (
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <h1>Speed (Ao5)</h1>
        <p className="muted">
          5 solves; we drop your fastest and slowest and average the rest. Lean on the shortcuts:
          anything that adds to 7 is 0, and +6 is −1. Aim for under 5 seconds — then under 2, like
          Conway.
        </p>
        <PrimaryButton
          onClick={() => {
            unlockAudio()
            start()
          }}
        >
          Start
        </PrimaryButton>
        <PrimaryButton style={secondaryButtonStyle} onClick={() => onDone(tier, null)}>
          Back
        </PrimaryButton>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <div className="serif" style={{ fontSize: 28, fontWeight: 600 }}>
          {result === null ? 'DNF' : `${(result / 1000).toFixed(2)}s`}
        </div>
        <p className="muted">
          {tier > 0 ? `${TIER_BADGES[tier]} ${TIER_LABELS[tier]}` : 'No tier — keep going!'}
        </p>
        <PrimaryButton onClick={start}>Again</PrimaryButton>
        <PrimaryButton style={secondaryButtonStyle} onClick={() => onDone(tier, result)}>
          Done
        </PrimaryButton>
      </div>
    )
  }

  // phase === 'solving'
  return (
    <SolveScreen
      minHeight="100%"
      footer={<WeekdayPicker weekStart={weekStart} graded={false} onPick={(w) => answer(w)} />}
    >
      <div style={{ fontWeight: 600 }} className="tabnums">
        {count + 1}/{total}
      </div>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <div className="serif" style={{ fontSize: 28, fontWeight: 600 }}>
          {problem && formatDate(problem.year, problem.month, problem.day)}
        </div>
      </div>
    </SolveScreen>
  )
}

export function LevelsScreen() {
  const [level, raiseLevel] = useUnlockedLevelState()
  const [testing, setTesting] = useState<number | null>(null)
  const [speed, setSpeed] = useState(false)
  const { tier: bestTier, bestMs, record: recordBest } = useSpeedBest()

  if (testing !== null) {
    return (
      <div className="screen">
        <LevelTest
          target={testing}
          onDone={(unlockedTo) => {
            setTesting(null)
            // Reflect a pass immediately from the known result — no read-back race
            // against useLevelTest's async unlock write.
            if (unlockedTo !== null) raiseLevel(unlockedTo)
          }}
        />
      </div>
    )
  }

  if (speed) {
    return (
      <div className="screen">
        <SpeedChallenge
          onDone={(earnedTier, earnedMs) => {
            setSpeed(false)
            // Reflect a just-earned tier + time immediately — monotonic, no read-back
            // race against useSpeedChallenge's async best-tier/best-Ao5 writes.
            recordBest(earnedTier, earnedMs)
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
        <PrimaryButton onClick={() => setTesting(takeable)}>
          Take the Level {takeable} test →
        </PrimaryButton>
      ) : (
        <p style={{ marginTop: 16, fontWeight: 600 }}>Full range unlocked 🎉</p>
      )}
      <PrimaryButton style={secondaryButtonStyle} onClick={() => setSpeed(true)}>
        {`Speed challenge${
          bestMs !== null ? ` · best ${formatAo5(bestMs)}${bestTier > 0 ? ` ${TIER_BADGES[bestTier]}` : ''}` : ''
        } →`}
      </PrimaryButton>
    </div>
  )
}
