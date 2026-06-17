import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAttempts, countByDay } from '../../db/attempts'
import { getMeta } from '../../db/meta'
import { localDayKey } from '../../lib/datekey'
import { summarize, accuracyByDimension, weakest, type Summary } from './stats'
import { buildHeatmap, type HeatModel } from './heatmap'
import { Heatmap } from '../../components/Heatmap'
import type { Attempt } from '../../db/db'

interface Data {
  attempts: Attempt[]
  heat: HeatModel
  summary: Summary
  streak: { current: number; longest: number }
}

export function ProgressScreen() {
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const [attempts, counts, current, longest] = await Promise.all([
        listAttempts(),
        countByDay(),
        getMeta<number>('currentStreak', 0),
        getMeta<number>('longestStreak', 0),
      ])
      if (!active) return
      setData({
        attempts,
        heat: buildHeatmap(counts, localDayKey()),
        summary: summarize(attempts),
        streak: { current, longest },
      })
    })()
    return () => {
      active = false
    }
  }, [])

  if (!data) return <div className="screen" />

  if (data.attempts.length === 0) {
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
            to="/practice"
            style={{ color: 'var(--burg)', fontWeight: 700, textDecoration: 'none' }}
          >
            Start drilling →
          </Link>
        </div>
      </div>
    )
  }

  const { summary, streak } = data
  const centuries = accuracyByDimension(data.attempts, 'century')
  const weak = weakest(centuries)
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
          <span style={{ width: 54, color: 'var(--muted)' }}>{b.label}</span>
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
    </div>
  )
}
