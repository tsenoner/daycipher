import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Speedrun } from './Speedrun'

describe('Speedrun', () => {
  it('shows the ready screen with a Start button', () => {
    render(<Speedrun />)
    expect(screen.getByRole('heading', { name: 'Speedrun' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })
})
