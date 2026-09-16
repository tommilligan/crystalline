import { Stack } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { type ReactNode, useEffect, useRef } from 'react'
import { PHASES, type Phase } from '../../types/board'
import { BoardColumnShell } from './BoardColumnShell'
import { type ColumnLayoutState, computeColumnLayout } from './columnLayout'

interface BoardLayoutProps {
  currentPhase: Phase
  onFocusPhase: (phase: Phase) => void
  hasData: Record<Phase, boolean>
  columns: Record<Phase, ReactNode>
}

// Fixed width for a collapsed column's rotated-label sliver — enough to fit the label at the
// chosen font size without wrapping, in both the wide (row) and narrow (stacked) layouts.
const COLLAPSED_WIDTH = 56

// Relative widths for expanded columns: the primary (current-phase) column gets three times the
// flex-grow of a secondary one, so it reads as "most of the width" without secondary columns
// (e.g. the problem statement) shrinking to unreadable.
const FLEX_GROW: Record<Extract<ColumnLayoutState, 'primary' | 'secondary'>, number> = {
  primary: 3,
  secondary: 1,
}

/**
 * Wide screens (projector/laptop, the primary MVP scenario per `docs/ui-notes.md`) lay columns
 * out in a single row whose widths follow `computeColumnLayout`: hidden columns aren't rendered,
 * collapsed ones shrink to a fixed-width rotated-text sliver, and expanded ones share the rest
 * of the row (primary getting the most). Narrower screens stack the same columns as full-width
 * rows instead, except collapsed columns stay a compact sliver-width block rather than
 * stretching full width, since there's nothing to show at that size anyway.
 */
export function BoardLayout({ currentPhase, onFocusPhase, hasData, columns }: BoardLayoutProps) {
  const isWide = useMediaQuery('(min-width: 1100px)', true)
  const emphasizedRef = useRef<HTMLDivElement>(null)
  const layout = computeColumnLayout(currentPhase, hasData)
  const visiblePhases = PHASES.filter((phase) => layout[phase.key] !== 'hidden')

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentPhase changes which element emphasizedRef.current points to (set during render), so it must retrigger this effect
  useEffect(() => {
    if (!isWide) {
      emphasizedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentPhase, isWide])

  if (isWide) {
    return (
      <div style={{ display: 'flex', gap: 'var(--mantine-spacing-md)', alignItems: 'stretch' }}>
        {visiblePhases.map((phase) => {
          const nextPhase = PHASES[PHASES.indexOf(phase) + 1]
          const state = layout[phase.key] as Exclude<ColumnLayoutState, 'hidden'>
          const style =
            state === 'collapsed'
              ? { flex: `0 0 ${COLLAPSED_WIDTH}px` }
              : { flex: `${FLEX_GROW[state]} 1 0%`, minWidth: 0 }
          return (
            <div key={phase.key} style={style}>
              <BoardColumnShell
                phase={phase}
                layout={state}
                onFocus={() => onFocusPhase(phase.key)}
                onAdvance={nextPhase ? () => onFocusPhase(nextPhase.key) : undefined}
              >
                {columns[phase.key]}
              </BoardColumnShell>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Stack gap="md">
      {visiblePhases.map((phase) => {
        const state = layout[phase.key] as Exclude<ColumnLayoutState, 'hidden'>
        const emphasized = phase.key === currentPhase
        const nextPhase = PHASES[PHASES.indexOf(phase) + 1]
        return (
          <div
            key={phase.key}
            ref={emphasized ? emphasizedRef : undefined}
            style={state === 'collapsed' ? { width: COLLAPSED_WIDTH } : undefined}
          >
            <BoardColumnShell
              phase={phase}
              layout={state}
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
