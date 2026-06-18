import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { yearDoomsdayOddEleven } from '../../engine'
import { formatDate, weekdayName } from '../../lib/format'
import { getMeta, setMeta } from '../../db/meta'
import { localDayKey } from '../../lib/datekey'
import { getCompleted, getPracticeUnlocked, isPracticeUnlocked } from '../learn/learnGate'
import type { DailyResult } from '../daily/useDaily'

export function TodayScreen() {
  const [streak, setStreak] = useState({ current: 0, longest: 0 })
  const [daily, setDaily] = useState<DailyResult | null>(null)
  // null = not loaded yet; avoids flashing the welcome banner before meta resolves.
  const [onboarded, setOnboarded] = useState<boolean | null>(null)
  // Default to NOT locked so unlocked users never see a lock-aware copy flash.
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([
      getMeta<number>('currentStreak', 0),
      getMeta<number>('longestStreak', 0),
      getMeta<DailyResult | null>('daily:' + localDayKey(), null),
      getMeta<boolean>('onboarded', false),
      getCompleted(),
      getPracticeUnlocked(),
    ]).then(([current, longest, d, value, completed, practiceUnlocked]) => {
      if (active) {
        setStreak({ current, longest })
        setDaily(d)
        setOnboarded(value)
        setLocked(!isPracticeUnlocked(completed, practiceUnlocked))
      }
    })
    return () => {
      active = false
    }
  }, [])

  const now = new Date()
  const year = now.getFullYear()
  const yearDoomsday = yearDoomsdayOddEleven(year)

  return (
    <div className="screen">
      {onboarded === false && (
        <div
          style={{
            background: 'var(--card)',
            border: '1px solid var(--gold)',
            borderRadius: 'var(--radius)',
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div style={{ fontWeight: 700 }}>Welcome to Daycipher 👋</div>
          <p className="muted" style={{ fontSize: 13, margin: '6px 0' }}>
            New here? Start with{' '}
            <Link to="/learn" style={{ color: 'var(--burg)' }}>
              Learn
            </Link>
            {locked ? (
              <>. Practice unlocks as you finish Learn.</>
            ) : (
              <>
                , then drill in{' '}
                <Link to="/practice" style={{ color: 'var(--burg)' }}>
                  Practice
                </Link>
                .
              </>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              void setMeta('onboarded', true)
              setOnboarded(true)
            }}
            style={{
              minHeight: 40,
              borderRadius: 10,
              border: 0,
              background: 'var(--burg)',
              color: '#fff',
              fontWeight: 600,
              padding: '0 14px',
            }}
          >
            Got it
          </button>
        </div>
      )}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 999,
          padding: '4px 12px',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        🔥 {streak.current}-day streak · best {streak.longest}
      </div>

      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: 16,
          marginTop: 16,
        }}
      >
        <div
          className="muted"
          style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}
        >
          Today · {formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate())}
        </div>
        <div className="serif" style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
          This year's doomsday: {weekdayName(yearDoomsday)}
        </div>
      </div>

      <Link
        to="/daily"
        style={{
          display: 'block',
          marginTop: 16,
          background: 'var(--burg)',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: 'var(--radius)',
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700 }}>Daily Challenge</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {daily ? `Done today · ${daily.score}/${daily.total}` : '5 dates · same for everyone'}
            </div>
          </div>
          <span className="serif" style={{ fontSize: 20 }}>
            →
          </span>
        </div>
      </Link>

      <Link
        to={locked ? '/learn' : '/practice'}
        style={{
          display: 'block',
          textAlign: 'center',
          marginTop: 12,
          border: '1.5px solid var(--burg)',
          color: 'var(--burg)',
          textDecoration: 'none',
          borderRadius: 12,
          padding: '12px',
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {locked ? 'Continue learning →' : 'Quick Drill →'}
      </Link>
    </div>
  )
}
