import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CURRICULUM, getStage } from './curriculum'
import { LessonBlocks } from '../../components/LessonBlocks'
import { BooleanPicker } from '../../components/BooleanPicker'
import { NumberPad } from '../../components/NumberPad'
import { WeekdayPicker } from '../../components/WeekdayPicker'
import { useSettings } from '../../store/settings'
import { booleanLabel, weekdayName } from '../../lib/format'
import { useLessonDrill } from './useLessonDrill'
import { ruleFor } from './learnMastery'
import type { Weekday } from '../../engine'
import { getCompleted, isStageUnlocked } from './learnGate'
import { isDone } from './learnProgress'

const LAST_STAGE_ID = CURRICULUM[CURRICULUM.length - 1].id

export function LessonScreen() {
  const { stageId } = useParams()
  const stage = stageId ? getStage(stageId) : undefined
  const navigate = useNavigate()
  // null while the completed set is loading — avoids flashing a locked redirect.
  const [completed, setCompleted] = useState<string[] | null>(null)
  const [mode, setMode] = useState<'idle' | 'learn' | 'practice'>('idle')

  useEffect(() => {
    let active = true
    void getCompleted().then((c) => {
      if (active) setCompleted(c)
    })
    return () => {
      active = false
    }
  }, [])

  // Redirect away from a locked stage once we know the completed set. Done in an
  // effect so navigation never runs during render.
  const locked = stage != null && completed != null && !isStageUnlocked(stage.id, completed)
  const stageDone = stage != null && completed != null && isDone(stage.id, completed)
  useEffect(() => {
    // Send a locked stage back to the Learn map (not into an arbitrary earlier
    // lesson) so the learner sees what is unlocked and what is next.
    if (locked) navigate('/learn', { replace: true })
  }, [locked, navigate])

  if (!stage) {
    return (
      <div className="screen">
        <p>Lesson not found.</p>
        <Link to="/learn" style={{ color: 'var(--burg)' }}>
          ← Learn
        </Link>
      </div>
    )
  }

  if (completed === null || locked) {
    return <div className="screen" />
  }

  return (
    <div className="screen">
      <Link to="/learn" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
        ← Learn
      </Link>
      <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Stage {stage.n}
      </div>
      <h1 style={{ marginTop: 2 }}>{stage.title}</h1>
      <p className="muted">{stage.goal}</p>
      <LessonBlocks blocks={stage.blocks} />
      {mode !== 'idle' ? (
        // Key on `mode` so the learn→practice flip REMOUNTS the drill: practice
        // must start from a genuinely fresh window. Without it React reuses the
        // same instance and the finished learn run's results/feedback bleed in.
        <LessonDrill
          key={mode}
          stageId={stage.id}
          practice={mode === 'practice'}
          onPracticeAgain={() => setMode('practice')}
        />
      ) : (
        <button
          type="button"
          onClick={() => setMode(stageDone ? 'practice' : 'learn')}
          style={{
            marginTop: 16,
            width: '100%',
            minHeight: 'var(--tap)',
            borderRadius: 12,
            border: 0,
            background: 'var(--green)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          {stageDone ? 'Practice again' : 'Start exercises →'}
        </button>
      )}
    </div>
  )
}

const dotStyle = (bg: string): React.CSSProperties => ({
  width: 14,
  height: 14,
  borderRadius: 999,
  background: bg,
  border: bg === 'transparent' ? '1.5px solid var(--line)' : 0,
})

function LessonDrill({
  stageId,
  practice = false,
  onPracticeAgain,
}: {
  stageId: string
  practice?: boolean
  onPracticeAgain: () => void
}) {
  const drill = useLessonDrill(stageId, { practice })
  const weekStart = useSettings((s) => s.weekStart)
  const rule = ruleFor(stageId)

  if (!drill.loaded) {
    return <div className="screen" />
  }

  const { current, progress, feedback, done } = drill
  const window = progress.window

  const dots = Array.from({ length: rule.M }, (_, i) => {
    let bg = 'transparent'
    if (i < window.length) bg = window[i] ? 'var(--green)' : 'var(--burg)'
    return <span key={i} style={dotStyle(bg)} />
  })

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{dots}</div>
      <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
        {practice
          ? 'Practice mode — drill as long as you like'
          : progress.done
            ? '✓ Internalized'
            : `${progress.remaining} more good answer(s) to internalize`}
      </div>

      {feedback && (
        <div
          role="status"
          style={{
            marginTop: 12,
            padding: '8px 12px',
            borderRadius: 10,
            background: feedback.correct ? 'var(--green)' : 'var(--burg)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {feedback.correct
            ? '✓ Correct'
            : `✕ Not quite — it was ${
                feedback.answerKind === 'weekday'
                  ? weekdayName(feedback.answer as Weekday)
                  : feedback.answerKind === 'boolean'
                    ? booleanLabel(feedback.answer as 0 | 1)
                    : feedback.answer
              }`}
        </div>
      )}

      {!practice && done ? (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stageId === LAST_STAGE_ID ? (
            <Link
              to="/practice"
              style={{ color: 'var(--burg)', fontWeight: 700, textDecoration: 'none' }}
            >
              Practice unlocked → Start practicing
            </Link>
          ) : (
            <Link
              to="/learn"
              style={{ color: 'var(--burg)', fontWeight: 700, textDecoration: 'none' }}
            >
              Back to Learn →
            </Link>
          )}
          <button
            type="button"
            onClick={onPracticeAgain}
            style={{
              minHeight: 'var(--tap)',
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--card)',
              color: 'var(--ink)',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Practice again
          </button>
        </div>
      ) : (
        <>
          {current && (
            <div style={{ marginTop: 16 }}>
              <div className="serif" style={{ fontSize: 20, fontWeight: 600 }}>
                {current.prompt}
              </div>
              {current.sub && (
                <div className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 12 }}>
                  {current.sub}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                {current.answerKind === 'number' ? (
                  <NumberPad
                    options={current.options ?? []}
                    graded={false}
                    onPick={(n) => drill.answer(n)}
                  />
                ) : current.answerKind === 'boolean' ? (
                  <BooleanPicker graded={false} onPick={(n) => drill.answer(n)} />
                ) : (
                  <WeekdayPicker
                    weekStart={weekStart}
                    graded={false}
                    onPick={(w) => drill.answer(w)}
                  />
                )}
              </div>
            </div>
          )}
          {practice && (
            <div style={{ marginTop: 16 }}>
              <Link to="/learn" style={{ color: 'var(--burg)', fontWeight: 700, textDecoration: 'none' }}>
                Done →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
