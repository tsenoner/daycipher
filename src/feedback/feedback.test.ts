import { describe, it, expect, vi, afterEach } from 'vitest'
import { haptic, playFeedback, chime } from './feedback'

afterEach(() => vi.unstubAllGlobals())

describe('feedback', () => {
  it('haptic uses navigator.vibrate when available', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    haptic(true)
    expect(vibrate).toHaveBeenCalledWith(15)
    haptic(false)
    expect(vibrate).toHaveBeenCalledWith([10, 60, 10])
  })
  it('chime is a no-op before unlockAudio', () => {
    expect(() => chime(true)).not.toThrow()
  })
  it('playFeedback respects the sound flag and still vibrates', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    expect(() => playFeedback(true, { sound: false })).not.toThrow()
    expect(vibrate).toHaveBeenCalled()
  })
})
