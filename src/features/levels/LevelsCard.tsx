import { Link } from 'react-router-dom'
import { LEVELS, MAX_LEVEL, TIER_BADGES } from './levels'
import { useUnlockedLevelState } from './useUnlockedLevel'
import { useSpeedBestTier } from './useSpeedChallenge'

/** Entry card on the Practice tab → /levels. */
export function LevelsCard() {
  const [level] = useUnlockedLevelState()
  const [tier] = useSpeedBestTier()

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
      <span style={{ color: 'var(--burg)', fontWeight: 700 }}>{tier > 0 ? `${TIER_BADGES[tier]} →` : '→'}</span>
    </Link>
  )
}
