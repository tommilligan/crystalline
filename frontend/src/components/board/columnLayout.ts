import { PHASES, type Phase } from '../../types/board'

export type ColumnLayoutState = 'hidden' | 'collapsed' | 'primary' | 'secondary'

/**
 * Decides, per column, whether to hide it entirely, collapse it to a rotated-text sliver, or
 * show it expanded — and if expanded, whether it's the "primary" column (the current phase,
 * which gets most of the available width) or merely "secondary" (expanded but not current,
 * e.g. the problem statement staying visible once later phases are in progress).
 *
 * Rules, from narrowest to broadest:
 * - The problem column (phase 1) is always visible and never collapses.
 * - A column is visible (collapsed or expanded — its existence is shown) once it is selected,
 *   or once any column at or after it has data: selecting/populating column N implies columns
 *   1..N exist, even if the user hasn't visited them.
 * - The options column (phase 2) collapses to a sliver whenever a later phase (3-5) is
 *   selected — once the team has moved on, the option list is redundant (every later column
 *   echoes it), so it doesn't need space. Selecting it again re-expands it, since idea text is
 *   only editable there.
 * - Columns 3-5 expand once they hold data, or whenever they're the selected column; otherwise
 *   they stay hidden or collapsed.
 * - The selected column, if visible, is always "primary"; every other expanded column is
 *   "secondary".
 */
export function computeColumnLayout(
  selectedPhase: Phase,
  hasData: Record<Phase, boolean>,
): Record<Phase, ColumnLayoutState> {
  const selectedNumber = PHASES.find((phase) => phase.key === selectedPhase)?.number ?? 1
  const maxDataNumber = PHASES.reduce(
    (max, phase) => (hasData[phase.key] ? Math.max(max, phase.number) : max),
    0,
  )

  const layout = {} as Record<Phase, ColumnLayoutState>

  for (const { key, number } of PHASES) {
    const isSelected = key === selectedPhase
    const visible = number === 1 || number <= selectedNumber || number <= maxDataNumber

    if (!visible) {
      layout[key] = 'hidden'
      continue
    }

    const expanded =
      number === 1 ||
      isSelected ||
      (number === 2 && selectedNumber <= 2) ||
      (number >= 3 && hasData[key])

    layout[key] = !expanded ? 'collapsed' : isSelected ? 'primary' : 'secondary'
  }

  return layout
}
