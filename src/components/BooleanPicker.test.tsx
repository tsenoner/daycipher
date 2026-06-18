import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BooleanPicker } from './BooleanPicker'

describe('BooleanPicker', () => {
  it('renders No/Yes and reports 0 for No, 1 for Yes', async () => {
    const onPick = vi.fn()
    render(<BooleanPicker graded={false} onPick={onPick} />)
    expect(screen.getByRole('group', { name: /yes or no/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'No' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(onPick).toHaveBeenNthCalledWith(1, 0)
    expect(onPick).toHaveBeenNthCalledWith(2, 1)
  })

  it('disables both buttons when graded', () => {
    render(<BooleanPicker graded guessed={1} correct={0} onPick={() => {}} />)
    expect(screen.getByRole('button', { name: /No/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Yes/ })).toBeDisabled()
  })
})
