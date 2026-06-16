import { type ChangeEvent } from 'react'
import { useSettings, type Theme } from '../../store/settings'
import { InstallPrompt } from '../../components/InstallPrompt'
import { exportAll, importAll, type Backup } from '../../db/backup'

export function SettingsScreen() {
  const { theme, setTheme } = useSettings()

  async function onExport() {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `daycipher-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const data = JSON.parse(await file.text()) as Backup
    await importAll(data)
    alert('Backup imported.')
  }

  return (
    <div className="screen">
      <h1>Settings</h1>

      <h3>Theme</h3>
      <div role="radiogroup" aria-label="Theme" style={{ display: 'flex', gap: 8 }}>
        {(['system', 'light', 'dark'] as Theme[]).map((t) => (
          <button
            key={t}
            aria-pressed={theme === t}
            onClick={() => setTheme(t)}
            style={{
              minHeight: 44,
              padding: '8px 14px',
              borderRadius: 10,
              border: `1px solid ${theme === t ? 'var(--burg)' : 'var(--line)'}`,
              background: theme === t ? 'var(--burg)' : 'var(--card)',
              color: theme === t ? '#fff' : 'var(--ink)',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <h3>Your data</h3>
      <button onClick={onExport} style={{ minHeight: 44 }}>
        Export backup (JSON)
      </button>
      <p>
        <label>
          Import backup: <input type="file" accept="application/json" onChange={onImport} />
        </label>
      </p>

      <h3>Install</h3>
      <InstallPrompt />
    </div>
  )
}
