import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Today', end: true },
  { to: '/learn', label: 'Learn', end: false },
  { to: '/practice', label: 'Practice', end: false },
  { to: '/progress', label: 'Progress', end: false },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'space-around',
        background: 'var(--card)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        maxWidth: 540,
        margin: '0 auto',
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
            minHeight: 56,
            textDecoration: 'none',
            fontWeight: 600,
            color: isActive ? 'var(--burg)' : 'var(--muted)',
          })}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}
