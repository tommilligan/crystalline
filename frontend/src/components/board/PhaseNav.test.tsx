import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PhaseNav } from './PhaseNav'

function renderWithProvider(ui: React.ReactElement) {
  return render(<MantineProvider>{ui}</MantineProvider>)
}

describe('PhaseNav', () => {
  it('renders all five phases', () => {
    renderWithProvider(<PhaseNav currentPhase="situation" onChange={vi.fn()} />)
    for (const label of ['Situation', 'Ideation', 'Evaluation', 'Scoring', 'Decision']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument()
    }
  })

  it('calls onChange with the clicked phase, never blocking navigation', () => {
    const onChange = vi.fn()
    renderWithProvider(<PhaseNav currentPhase="situation" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Decision' }))
    expect(onChange).toHaveBeenCalledWith('decision')
  })

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn()
    renderWithProvider(<PhaseNav currentPhase="situation" onChange={onChange} disabled />)
    fireEvent.click(screen.getByRole('tab', { name: 'Decision' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
