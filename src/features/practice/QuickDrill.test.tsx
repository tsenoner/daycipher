import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { QuickDrill } from './QuickDrill'
import { _resetDbForTests } from '../../db/db'

describe('QuickDrill', () => {
  beforeEach(async () => {
    await _resetDbForTests()
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase('daycipher')
      req.onsuccess = req.onerror = req.onblocked = () => resolve()
    })
  })

  // #18: the screen must fill the inner-scroll container (.app-main), not the
  // viewport — a vh floor over-measures and pushes the bottom-pinned buttons
  // below the fold. The SolveScreen root carries the minHeight.
  it('fills the scroll container with minHeight 100% (no viewport vh)', () => {
    const { container } = render(<QuickDrill />)
    const screenEl = container.querySelector('.screen') as HTMLElement | null
    expect(screenEl).not.toBeNull()
    expect(screenEl?.style.minHeight).toBe('100%')
  })
})
