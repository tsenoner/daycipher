import { describe, it, expect } from 'vitest'
import { DEV_UNLOCK_ALL } from './devFlags'

describe('DEV_UNLOCK_ALL', () => {
  it('is OFF under the test runner (so it never leaks into tests or production)', () => {
    // Vitest runs with MODE === 'test', so the dev unlock must be false here.
    // This locks the safety invariant: the gate is only active in `vite dev`.
    expect(DEV_UNLOCK_ALL).toBe(false)
  })
})
