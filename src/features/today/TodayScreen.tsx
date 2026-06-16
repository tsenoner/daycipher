import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { explain } from '../../engine'
import { formatDate, weekdayName } from '../../lib/format'
import { getMeta } from '../../db/meta'

export function TodayScreen() {
  const [streak, setStreak] = useState({ current: 0, longest: 0 })

  useEffect(() => {
    let active = true
    void Promise.all([
      getMeta<number>('currentStreak', 0),
      getMeta<number>('longestStreak', 0),
    ]).then(([current, longest]) => {
      if (active) setStreak({ current, longest })
    })
    return () => {
      active = false
    }
  }, [])

  const now = new Date()
  const year = now.getFullYear()
  const yearDoomsday = explain(year, 4, 4).yearDoomsday

  return (
    <div className="screen">
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
        to="/practice"
        style={{
          display: 'block',
          textAlign: 'center',
          marginTop: 16,
          background: 'var(--burg)',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: 12,
          padding: '14px',
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        Quick Drill →
      </Link>
    </div>
  )
}
