import { Link } from 'react-router-dom'
import { useDaily } from './useDaily'
import { WeekdayPicker } from '../../components/WeekdayPicker'
import { formatDate, weekdayName } from '../../lib/format'
import { weekdayOfYMD, type Weekday } from '../../engine'
import { useSettings } from '../../store/settings'

function shareResult(dayKey: string, score: number, total: number) {
  const text = `Daycipher Daily ${dayKey}: ${score}/${total}`
  if (typeof navigator !== 'undefined' && navigator.share) {
    void navigator.share({ text }).catch(() => {})
  } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
    void navigator.clipboard.writeText(text)
  }
}

export function DailyChallenge() {
  const { dayKey, current, finished, score, dates, results, prior, answer } = useDaily()
  const weekStart = useSettings((s) => s.weekStart)

  if (prior === undefined) return <div className="screen" />

  const alreadyDone = prior !== null && results.length === 0
  if (alreadyDone || finished) {
    const sc = finished ? score : prior!.score
    const tot = finished ? dates.length : prior!.total
    return (
      <div className="screen">
        <Link to="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
          ← Today
        </Link>
        <h1>Daily Challenge</h1>
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
          <div className="serif" style={{ fontSize: 32, fontWeight: 600 }}>
            {sc} / {tot}
          </div>
          <p className="muted">Come back tomorrow for a new set.</p>
          <button
            type="button"
            onClick={() => shareResult(dayKey, sc, tot)}
            style={{
              minHeight: 44,
              marginTop: 8,
              borderRadius: 10,
              border: 0,
              background: 'var(--burg)',
              color: '#fff',
              fontWeight: 700,
              padding: '0 16px',
            }}
          >
            Share result
          </button>
        </div>
        {finished && (
          <div style={{ marginTop: 16 }}>
            {results.map((r, i) => {
              const right = weekdayOfYMD(r.p.year, r.p.month, r.p.day)
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid var(--line)',
                    fontSize: 13,
                  }}
                >
                  <span>{formatDate(r.p.year, r.p.month, r.p.day)}</span>
                  <span
                    style={{ color: r.correct ? 'var(--green)' : 'var(--burg)', fontWeight: 600 }}
                  >
                    {weekdayName(right)}
                    {r.correct ? ' ✓' : ` ✕ (you: ${weekdayName(r.guessed)})`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', minHeight: '62vh' }}>
      <Link to="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
        ← Today
      </Link>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <div
          className="muted"
          style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}
        >
          Daily · {results.length + 1} of {dates.length}
        </div>
        <div className="serif" style={{ fontSize: 28, fontWeight: 600, marginTop: 6 }}>
          {current && formatDate(current.year, current.month, current.day)}
        </div>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        <WeekdayPicker weekStart={weekStart} graded={false} onPick={(w: Weekday) => answer(w)} />
      </div>
    </div>
  )
}
