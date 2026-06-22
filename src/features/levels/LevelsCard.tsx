import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMeta } from '../../db/meta'
import { LEVELS, MAX_LEVEL, clampLevel } from './levels'

/** Entry card on the Practice tab → /levels. */
export function LevelsCard() {
  const [level, setLevel] = useState(0)
  useEffect(() => {
    let active = true
    void getMeta<number>('unlockedLevel', 0).then((l) => {
      if (active) setLevel(clampLevel(l))
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Link
      to="/levels"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: '12px 16px 0',
        padding: 14,
        borderRadius: 12,
        border: '1px solid var(--line)',
        background: 'var(--card)',
        color: 'var(--ink)',
        textDecoration: 'none',
      }}
    >
      <span>
        <span className="muted" style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Levels
        </span>
        <span style={{ display: 'block', fontWeight: 600 }}>
          {LEVELS[level].label} · Level {level} of {MAX_LEVEL}
        </span>
      </span>
      <span style={{ color: 'var(--burg)', fontWeight: 700 }}>→</span>
    </Link>
  )
}
