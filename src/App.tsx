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
          // Fixed-size flex child pinned to the top of the shell column; it must not
          // shrink so it (and the wordmark) never shift as the middle region scrolls.
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          // Push the wordmark/gear clear of the iOS status-bar clock/notch in the
          // installed PWA. The inset is on padding-top only, so the header background
          // and bottom border still reach the physical top edge (no gap above it).
          // env(safe-area-inset-top) resolves to 0 off-notch, so desktop/Android are
          // unaffected — the header keeps its original 12px top padding there.
          padding: 'calc(12px + env(safe-area-inset-top)) 16px 12px',
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
      {/* Only this middle region scrolls; the header and nav stay structurally pinned,
          so the bottom tabs never move or repaint-jump when switching screens (iOS PWA). */}
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
      <UpdateToast />
    </div>
  )
}
