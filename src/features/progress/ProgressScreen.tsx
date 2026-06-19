import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAttempts, tallyByDay, practiceAttempts } from '../../db/attempts'
import { getMeta } from '../../db/meta'
import { localDayKey } from '../../lib/datekey'
import { useSettings } from '../../store/settings'
import { summarize, accuracyByDimension, weakest, stepStats, type Summary } from './stats'
import { achievements } from './achievements'
import { getCompleted, getPracticeUnlocked, isPracticeUnlocked } from '../learn/learnGate'
import { isDrillableCentury } from '../practice/selector'
import { buildHeatmap, type HeatModel } from './heatmap'
import { Heatmap } from '../../components/Heatmap'
import type { Attempt } from '../../db/db'

interface Data {
  attempts: Attempt[]
  heat: HeatModel
  summary: Summary
  streak: { current: number; longest: number }
  completed: string[]
  practiceUnlocked: boolean
}

export function ProgressScreen() {
  const weekStart = useSettings((s) => s.weekStart)
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const [attempts, current, longest, completed, practiceUnlocked] = await Promise.all([
        listAttempts(),
        getMeta<number>('currentStreak', 0),
        getMeta<number>('longestStreak', 0),
        getCompleted(),
        getPracticeUnlocked(),
      ])
      if (!active) return
      setData({
        attempts,
        heat: buildHeatmap(tallyByDay(attempts), localDayKey(), 18, weekStart),
        summary: summarize(practiceAttempts(attempts)),
        streak: { current, longest },
        completed,
        practiceUnlocked,
      })
    })()
    return () => {
      active = false
    }
  }, [weekStart])

  if (!data) return <div className="screen" />

  // The whole stats view is practice-scoped, so gate on practice rows, not all
  // attempts. A learn-only user (just `learn:*` reps) should see onboarding, not
  // an all-zero practice dashboard. Computed once here and reused below.
  const practice = practiceAttempts(data.attempts)

  if (practice.length === 0) {
    const practiceOpen = isPracticeUnlocked(data.completed, data.practiceUnlocked)
    return (
      <div className="screen">
        <h1>Progress</h1>
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: 20,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          <p className="muted">No drills yet — your stats and activity grid will grow here.</p>
          <Link
            to={practiceOpen ? '/practice' : '/learn'}
            style={{ color: 'var(--burg)', fontWeight: 700, textDecoration: 'none' }}
          >
            {practiceOpen ? 'Start drilling →' : 'Start learning →'}
          </Link>
        </div>
      </div>
    )
  }

  const { summary, streak } = data
  // Scope the century breakdown to the centuries Practice can actually re-drill, so the
  // list stays bounded under the wide proleptic range and "drill it" is always honoured.
  const centuries = accuracyByDimension(practice, 'century').filter((b) => isDrillableCentury(b.key))
  const weak = weakest(centuries)
  const steps = stepStats(practice)
  const achs = achievements(data.attempts, data.streak.longest, data.completed, summary)
  const tiles = [
    { n: `${streak.current}`, l: `streak · best ${streak.longest}` },
    { n: `${Math.round(summary.accuracy * 100)}%`, l: 'accuracy' },
    { n: `${summary.total}`, l: 'solved' },
    {
      n: summary.medianMs != null ? `${(summary.medianMs / 1000).toFixed(1)}s` : '—',
      l: 'median time',
    },
  ]

  return (
    <div className="screen">
      <h1>Progress</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {tiles.map((t) => (
          <div
            key={t.l}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div className="serif" style={{ fontSize: 22, fontWeight: 600 }}>
              {t.n}
            </div>
            <div
              className="muted"
              style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}
            >
              {t.l}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 20 }}>Last 18 weeks</h3>
      <Heatmap model={data.heat} />

      <h3 style={{ marginTop: 20 }}>Accuracy by century</h3>
      {centuries.map((b) => (
        <div
          key={b.key}
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13 }}
        >
          <span style={{ width: 64, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{b.label}</span>
          <span
            style={{
              flex: 1,
              height: 9,
              background: 'var(--line)',
              borderRadius: 99,
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                width: `${Math.round(b.accuracy * 100)}%`,
                background: 'var(--burg)',
              }}
            />
          </span>
          <span style={{ width: 36, textAlign: 'right' }}>{Math.round(b.accuracy * 100)}%</span>
        </div>
      ))}
      {weak && (
        <p style={{ marginTop: 12, fontSize: 13 }}>
          Weakest: <strong>{weak.label}</strong> ({Math.round(weak.accuracy * 100)}%) —{' '}
          <Link to="/practice" style={{ color: 'var(--burg)', fontWeight: 600 }}>
            drill it →
          </Link>
        </p>
      )}

      {steps.some((s) => s.total > 0) && (
        <>
          <h3 style={{ marginTop: 20 }}>Where you lose points</h3>
          {steps.map((s) => {
            const pct = s.total ? Math.round((s.wrong / s.total) * 100) : 0
            return (
              <div
                key={s.step}
                style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13 }}
              >
                <span style={{ width: 110, color: 'var(--muted)' }}>{s.label}</span>
                <span
                  style={{
                    flex: 1,
                    height: 9,
                    background: 'var(--line)',
                    borderRadius: 99,
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--burg)' }}
                  />
                </span>
                <span style={{ width: 64, textAlign: 'right' }}>
                  {pct}% ({s.total})
                </span>
              </div>
            )
          })}
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Missed-rate per step, from your Guided Solve attempts.
          </p>
        </>
      )}

      <h3 style={{ marginTop: 20 }}>Achievements</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {achs.map((a) => (
          <div
            key={a.id}
            style={{
              background: 'var(--card)',
              border: `1px solid ${a.earned ? 'var(--gold)' : 'var(--line)'}`,
              borderRadius: 12,
              padding: 12,
              opacity: a.earned ? 1 : 0.55,
            }}
          >
            <div style={{ fontWeight: 700, color: a.earned ? 'var(--gold)' : 'var(--ink)' }}>
              {a.earned ? '🏅 ' : ''}
              {a.label}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              {a.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
