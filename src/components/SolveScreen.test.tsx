import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SolveScreen } from './SolveScreen'

describe('SolveScreen', () => {
  // #18: the shared solve layout must fill its inner-scroll container
  // (.app-main), not the viewport — a vh floor over-measures and pushes the
  // bottom-pinned footer below the fold. minHeight defaults to 100% so no
  // drill/test-runner screen has to remember to pass it (and re-introduce the
  // vh regression). This guards every SolveScreen consumer at the source.
  it('defaults minHeight to 100% of the scroll container (no viewport vh)', () => {
    const { container } = render(<SolveScreen footer={<button>go</button>}>content</SolveScreen>)
    const root = container.firstChild as HTMLElement
    expect(root.style.minHeight).toBe('100%')
  })

  it('lets a caller override minHeight', () => {
    const { container } = render(
      <SolveScreen minHeight="50vh" footer={<button>go</button>}>content</SolveScreen>,
    )
    const root = container.firstChild as HTMLElement
    expect(root.style.minHeight).toBe('50vh')
  })
})
