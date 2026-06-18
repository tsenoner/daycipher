import { useEffect, useRef } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { UpdateToast } from './components/UpdateToast'
import { runPracticeUnlockMigration } from './features/learn/migration'

export function App() {
  // Run the one-time grandfather migration once per mount. The guard ref skips
  // StrictMode's double-invoke; the migration itself is idempotent regardless.
  const migrated = useRef(false)
  useEffect(() => {
    if (migrated.current) return
    migrated.current = true
    void runPracticeUnlockMigration()
  }, [])

  return (
    <div className="app-shell">
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <span className="serif" style={{ fontSize: 20 }}>
          Day<span style={{ color: 'var(--burg)' }}>cipher</span>
        </span>
        <Link
          to="/settings"
          aria-label="Settings"
          style={{ color: 'var(--muted)', textDecoration: 'none' }}
        >
          ⚙
        </Link>
      </header>
      <Outlet />
      <BottomNav />
      <UpdateToast />
    </div>
  )
}
