import { describe, it, expect } from 'vitest'
import { localDayKey } from './datekey'

describe('localDayKey', () => {
  it('formats local Y-M-D', () => {
    expect(localDayKey(new Date(2026, 5, 17, 9, 30).getTime())).toBe('2026-06-17')
    expect(localDayKey(new Date(2000, 0, 1).getTime())).toBe('2000-01-01')
  })
})
