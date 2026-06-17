import { describe, it, expect, beforeEach } from 'vitest'
import { useSettings, applyTheme } from './settings'

describe('settings store', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    useSettings.setState({ theme: 'system', weekStart: 1, soundEnabled: true })
  })

  it('applyTheme sets data-theme for dark and persists', () => {
    applyTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('daycipher-theme')).toBe('dark')
  })

  it('applyTheme removes data-theme for light', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
  })

  it('setTheme updates state', () => {
    useSettings.getState().setTheme('dark')
    expect(useSettings.getState().theme).toBe('dark')
  })
})
