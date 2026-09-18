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

// Caps how wide an expanded row column (Options, Evaluation, Decision) can stretch on wide
// screens — without this, its flex share of the row spreads list/field content out over a lot of
// empty space. Applied to the flex item div wrapping `BoardColumnShell`, not the card itself, so
// the row's default flex-start packing leaves any leftover space to the right rather than
// centering each column within its own slot.
const ROW_COLUMN_MAX_WIDTH = 800

/**
 * The situation column (the problem statement) always sits in its own full-width row at the
 * top, since it must stay visible at all times — every other column, however it's arranged,
 * only ever echoes or builds on it.
 *
 * Wide screens (projector/laptop, the primary MVP scenario per `docs/ui-notes.md`) lay the
 * remaining columns out in a single row below whose widths follow `computeColumnLayout`: hidden
 * columns aren't rendered, collapsed ones shrink to a fixed-width rotated-text sliver, and
 * expanded ones (primary or secondary alike) share the rest of the row equally — emphasis comes
 * from `BoardColumnShell`'s border/opacity, not from width. Narrower screens stack the same
 * columns as full-width rows instead; a collapsed column there stays full width like its
 * siblings but shrinks to just its header row, with the label left horizontal (see
 * `BoardColumnShell`) since there's no room to rotate it without wasting more height than it
 * saves.
 */
export function BoardLayout({ currentPhase, onFocusPhase, hasData, columns }: BoardLayoutProps) {
  const isWide = useMediaQuery('(min-width: 1100px)', true)
  const emphasizedRef = useRef<HTMLDivElement>(null)
  const layout = computeColumnLayout(currentPhase, hasData)
  const visiblePhases = PHASES.filter((phase) => layout[phase.key] !== 'hidden')

  // The Evaluation column stays expanded (not collapsed to a sliver) once Decision is selected,
  // as a read-only reference alongside it — see `columnLayout.ts` — so it shouldn't look
  // dimmed/deprioritised the way an ordinary secondary column does.
  const isReferenceColumn = (phaseKey: Phase) =>
    phaseKey === 'evaluation' && currentPhase === 'decision'

  // biome-ignore lint/correctness/useExhaustiveDependencies: currentPhase changes which element emphasizedRef.current points to (set during render), so it must retrigger this effect
  useEffect(() => {
    if (!isWide) {
      emphasizedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentPhase, isWide])

  if (isWide) {
    const situationPhase = PHASES[0]
    const rowPhases = visiblePhases.filter((phase) => phase.key !== situationPhase.key)
    return (
      <Stack gap="md">
        <BoardColumnShell
          phase={situationPhase}
          layout={layout[situationPhase.key] as Exclude<ColumnLayoutState, 'hidden'>}
          isWide={isWide}
          onFocus={() => onFocusPhase(situationPhase.key)}
        >
          {columns[situationPhase.key]}
        </BoardColumnShell>
        {rowPhases.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--mantine-spacing-md)', alignItems: 'stretch' }}>
            {rowPhases.map((phase) => {
              const state = layout[phase.key] as Exclude<ColumnLayoutState, 'hidden'>
              const style =
                state === 'collapsed'
                  ? { flex: `0 0 ${COLLAPSED_WIDTH}px` }
                  : { flex: '1 1 0%', minWidth: 0, maxWidth: ROW_COLUMN_MAX_WIDTH }
              return (
                <div key={phase.key} style={style}>
                  <BoardColumnShell
                    phase={phase}
                    layout={state}
                    isWide={isWide}
                    onFocus={() => onFocusPhase(phase.key)}
                    neverDim={isReferenceColumn(phase.key)}
                  >
                    {columns[phase.key]}
                  </BoardColumnShell>
                </div>
              )
            })}
          </div>
        )}
      </Stack>
    )
  }

  return (
    <Stack gap="md">
      {visiblePhases.map((phase) => {
        const state = layout[phase.key] as Exclude<ColumnLayoutState, 'hidden'>
        const emphasized = phase.key === currentPhase
        return (
          <div key={phase.key} ref={emphasized ? emphasizedRef : undefined}>
            <BoardColumnShell
              phase={phase}
              layout={state}
              isWide={isWide}
              onFocus={() => onFocusPhase(phase.key)}
              neverDim={isReferenceColumn(phase.key)}
            >
              {columns[phase.key]}
            </BoardColumnShell>
          </div>
        )
      })}
    </Stack>
  )
}
