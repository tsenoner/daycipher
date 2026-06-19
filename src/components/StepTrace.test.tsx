import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepTrace } from './StepTrace'
import { explain } from '../engine'

describe('StepTrace', () => {
  it('shows the reasoning for 14 March 1986', () => {
    render(<StepTrace trace={explain(1986, 3, 14)} defaultOpen />)
    expect(screen.getByText('How it works')).toBeInTheDocument()
    expect(screen.getByText(/1900s anchor/)).toBeInTheDocument()
    expect(screen.getByText('Wednesday')).toBeInTheDocument() // century anchor
    expect(screen.getAllByText('Friday').length).toBeGreaterThanOrEqual(1) // year doomsday + result
    expect(screen.getByText(/March anchor/)).toBeInTheDocument()
  })

  it('labels BC years/centuries via the era formatter, not raw negatives', () => {
    render(<StepTrace trace={explain(-44, 3, 14)} defaultOpen />)
    expect(screen.getByText(/101 BC anchor/)).toBeInTheDocument() // century -100, not "-100s"
    expect(screen.getByText(/45 BC doomsday/)).toBeInTheDocument() // year -44, not "-44"
  })
})
