import { useEffect, useState } from 'react'
import { onNeedRefresh, applyUpdate } from '../pwa/registerSW'

export function UpdateToast() {
  const [show, setShow] = useState(false)
  useEffect(() => onNeedRefresh(() => setShow(true)), [])
  if (!show) return null
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 'calc(76px + env(safe-area-inset-bottom))',
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius)',
        padding: 14,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        maxWidth: 508,
        margin: '0 auto',
        boxShadow: '0 10px 24px rgba(60,40,20,.18)',
      }}
    >
      <span>A new version is ready.</span>
      <button
        onClick={applyUpdate}
        style={{
          background: 'var(--burg)',
          color: '#fff',
          border: 0,
          borderRadius: 10,
          padding: '10px 14px',
          minHeight: 44,
        }}
      >
        Reload
      </button>
    </div>
  )
}
