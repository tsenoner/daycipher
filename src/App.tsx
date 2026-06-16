import { Link, Outlet } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { UpdateToast } from './components/UpdateToast'

export function App() {
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
