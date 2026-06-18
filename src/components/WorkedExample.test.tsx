import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkedExample } from './WorkedExample'
import { makeRng } from '../engine'
import { getStage, type Block } from '../features/learn/curriculum'

const hero = getStage('full')!.blocks.find((b): b is Extract<Block, { kind: 'example' }> => b.kind === 'example')!

describe('WorkedExample', () => {
  it('shows the hero by default and swaps to a generated one on "Show another"', async () => {
    render(<WorkedExample stageId="full" hero={hero} rng={makeRng(3)} />)
    expect(screen.getByText(hero.date)).toBeTruthy()

    await userEvent.click(screen.getByRole('button', { name: /show another/i }))
    // The hero date is gone; a generated "→ <Weekday>" answer is shown.
    expect(screen.queryByText(hero.date)).toBeNull()
    expect(screen.getByText(/→ \w+day/)).toBeTruthy()

    // Reset returns to the hero.
    await userEvent.click(screen.getByRole('button', { name: /back to the lesson example/i }))
    expect(screen.getByText(hero.date)).toBeTruthy()
  })

  it('renders no "Show another" for a stage without a generator', () => {
    render(<WorkedExample stageId="mod7" hero={hero} rng={makeRng(1)} />)
    expect(screen.queryByRole('button', { name: /show another/i })).toBeNull()
  })
})
