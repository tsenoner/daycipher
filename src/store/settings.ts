import { create } from 'zustand'

export type Theme = 'system' | 'light' | 'dark'

/** Apply a theme to <html> and persist for the pre-paint script. */
export function applyTheme(theme: Theme): void {
  const dark =
    theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  if (dark) root.setAttribute('data-theme', 'dark')
  else root.removeAttribute('data-theme')
  try {
    localStorage.setItem('daycipher-theme', theme)
  } catch {
    /* ignore */
  }
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('daycipher-theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    /* localStorage unavailable */
  }
  return 'system'
}

interface SettingsState {
  theme: Theme
  weekStart: 0 | 1 // 0 = Sunday, 1 = Monday
  soundEnabled: boolean
  setTheme: (t: Theme) => void
}

export const useSettings = create<SettingsState>((set) => ({
  theme: readStoredTheme(),
  weekStart: 1,
  soundEnabled: true,
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
}))
