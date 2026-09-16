import { SimpleGrid, Stack } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { type ReactNode, useEffect, useRef } from 'react'
import { PHASES, type Phase } from '../../types/board'
import { BoardColumnShell } from './BoardColumnShell'

interface BoardLayoutProps {
  currentPhase: Phase
  onFocusPhase: (phase: Phase) => void
  columns: Record<Phase, ReactNode>
}

/**
 * Wide screens (projector/laptop, the primary MVP scenarios per `docs/ui-notes.md`) show all
 * five columns side by side. Narrower screens stack the same five columns as full-width rows
 * instead. Clicking a column switches the emphasized phase, so navigation works the same way
 * in both layouts.
 */
export function BoardLayout({ currentPhase, onFocusPhase, columns }: BoardLayoutProps) {
  const isWide = useMediaQuery('(min-width: 1100px)', true)
  const emphasizedRef = useRef<HTMLDivElement>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentPhase changes which element emphasizedRef.current points to (set during render), so it must retrigger this effect
  useEffect(() => {
    if (!isWide) {
      emphasizedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentPhase, isWide])

  if (isWide) {
    return (
      <SimpleGrid cols={5} spacing="md">
        {PHASES.map((phase, index) => {
          const nextPhase = PHASES[index + 1]
          return (
            <BoardColumnShell
              key={phase.key}
              phase={phase}
              emphasized={phase.key === currentPhase}
              onFocus={() => onFocusPhase(phase.key)}
              onAdvance={nextPhase ? () => onFocusPhase(nextPhase.key) : undefined}
            >
              {columns[phase.key]}
            </BoardColumnShell>
          )
        })}
      </SimpleGrid>
    )
  }

  return (
    <Stack gap="md">
      {PHASES.map((phase, index) => {
        const emphasized = phase.key === currentPhase
        const nextPhase = PHASES[index + 1]
        return (
          <div key={phase.key} ref={emphasized ? emphasizedRef : undefined}>
            <BoardColumnShell
              phase={phase}
              emphasized={emphasized}
              onFocus={() => onFocusPhase(phase.key)}
              onAdvance={nextPhase ? () => onFocusPhase(nextPhase.key) : undefined}
            >
              {columns[phase.key]}
            </BoardColumnShell>
          </div>
        )
      })}
    </Stack>
  )
}
