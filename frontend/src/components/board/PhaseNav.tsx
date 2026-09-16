import { Tabs } from '@mantine/core'
import { PHASES, type Phase } from '../../types/board'

interface PhaseNavProps {
  currentPhase: Phase
  onChange: (phase: Phase) => void
  disabled?: boolean
}

/** Always-visible phase selector. Every phase is clickable at any time — see `docs/phases.md`:
 * the tool never locks a user out of a phase, it only nudges toward the intended order. */
export function PhaseNav({ currentPhase, onChange, disabled }: PhaseNavProps) {
  return (
    <Tabs
      value={currentPhase}
      onChange={(value) => value && !disabled && onChange(value as Phase)}
      variant="pills"
    >
      <Tabs.List>
        {PHASES.map((phase) => (
          <Tabs.Tab key={phase.key} value={phase.key} disabled={disabled}>
            {phase.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  )
}
