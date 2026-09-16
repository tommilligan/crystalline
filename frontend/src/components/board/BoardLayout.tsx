import { SimpleGrid } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import type { ReactNode } from 'react'
import { PHASES, type Phase } from '../../types/board'
import { BoardColumnShell } from './BoardColumnShell'

interface BoardLayoutProps {
  currentPhase: Phase
  onFocusPhase: (phase: Phase) => void
  columns: Record<Phase, ReactNode>
}

/**
 * Wide screens (projector/laptop, the primary MVP scenarios per `docs/ui-notes.md`) show all
 * five columns side by side. Narrower screens fall back to showing only the current phase's
 * column — the always-visible `PhaseNav` above this layout is what switches it, so navigation
 * still works without ever hiding data permanently.
 */
export function BoardLayout({ currentPhase, onFocusPhase, columns }: BoardLayoutProps) {
  const isWide = useMediaQuery('(min-width: 1100px)', true)

  if (isWide) {
    return (
      <SimpleGrid cols={5} spacing="md">
        {PHASES.map((phase) => (
          <BoardColumnShell
            key={phase.key}
            title={phase.column}
            emphasized={phase.key === currentPhase}
            onFocus={() => onFocusPhase(phase.key)}
          >
            {columns[phase.key]}
          </BoardColumnShell>
        ))}
      </SimpleGrid>
    )
  }

  const active = PHASES.find((phase) => phase.key === currentPhase) ?? PHASES[0]
  return (
    <BoardColumnShell title={active.column} emphasized onFocus={() => onFocusPhase(active.key)}>
      {columns[active.key]}
    </BoardColumnShell>
  )
}
