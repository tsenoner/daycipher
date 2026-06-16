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

interface SettingsState {
  theme: Theme
  weekStart: 0 | 1 // 0 = Sunday, 1 = Monday
  soundEnabled: boolean
  dailyGoal: number
  setTheme: (t: Theme) => void
  setWeekStart: (w: 0 | 1) => void
  setSoundEnabled: (s: boolean) => void
  setDailyGoal: (g: number) => void
}

export const useSettings = create<SettingsState>((set) => ({
  theme: (localStorage.getItem('daycipher-theme') as Theme) ?? 'system',
  weekStart: 1,
  soundEnabled: true,
  dailyGoal: 5,
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },
  setWeekStart: (weekStart) => set({ weekStart }),
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setDailyGoal: (dailyGoal) => set({ dailyGoal }),
}))
