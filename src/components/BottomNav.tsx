import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  getCompleted,
  getPracticeUnlocked,
  isPracticeUnlocked,
} from '../features/learn/learnGate'

const tabs = [
  { to: '/', label: 'Today', end: true },
  { to: '/learn', label: 'Learn', end: false },
  { to: '/practice', label: 'Practice', end: false },
  { to: '/progress', label: 'Progress', end: false },
]

export function BottomNav() {
  // Default to NOT locked so unlocked users never see a lock flash; only the async
  // check can switch this on.
  const [locked, setLocked] = useState(false)
  // BottomNav is a persistent sibling of the router Outlet, so it does not remount on
  // navigation. Depend on pathname to re-read the lock on every route change: since the
  // unlock is a one-way latch, moving (e.g. tapping Practice) reliably clears a stale lock.
  const { pathname } = useLocation()
  useEffect(() => {
    let active = true
    void Promise.all([getCompleted(), getPracticeUnlocked()]).then(([completed, unlocked]) => {
      if (active) setLocked(!isPracticeUnlocked(completed, unlocked))
    })
    return () => {
      active = false
    }
  }, [pathname])

  return (
    <nav
      aria-label="Primary"
      style={{
        // A fixed-size flex child at the bottom of the shell column — NOT position: fixed.
        // It spans the shell's width and stays put; switching screens scrolls only
        // .app-main, so the tab bar never moves or repaint-jumps (iOS PWA).
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-around',
        background: 'var(--card)',
        borderTop: '1px solid var(--line)',
        // Lift the tappable labels above the iOS home indicator; the bar background
        // still fills down to the physical bottom edge.
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          style={({ isActive }) => ({
            flex: 1,
            textAlign: 'center',
            padding: '12px 0',
            minHeight: 'var(--tap)',
            textDecoration: 'none',
            fontWeight: 600,
            color: isActive ? 'var(--burg)' : 'var(--muted)',
          })}
        >
          {t.to === '/practice' && locked ? `${t.label} 🔒` : t.label}
        </NavLink>
      ))}
    </nav>
  )
}
