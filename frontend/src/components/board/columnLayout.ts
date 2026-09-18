import { PHASES, type Phase, phaseNumber } from '../../types/board'

export type ColumnLayoutState = 'hidden' | 'collapsed' | 'primary' | 'secondary'

/**
 * Decides, per column, whether to hide it entirely, collapse it to a rotated-text sliver, or
 * show it expanded — and if expanded, whether it's the "primary" column (the current phase) or
 * merely "secondary" (expanded but not current, e.g. the problem statement staying visible once
 * later phases are in progress). Primary vs. secondary is purely a border-color distinction (see
 * `BoardColumnShell`) — both get the same width and full opacity, no dimming.
 *
 * Rules, from narrowest to broadest:
 * - The problem column (phase 1) is always visible and never collapses.
 * - A column is visible (collapsed or expanded — its existence is shown) once it is selected,
 *   or once any column at or after it has data: selecting/populating column N implies columns
 *   1..N exist, even if the user hasn't visited them.
 * - The options column (phase 2) collapses to a sliver whenever a later phase (3-4) is
 *   selected — once the team has moved on, the option list is redundant (every later column
 *   echoes it), so it doesn't need space. Selecting it again re-expands it (since idea text is
 *   only editable there), but only for as long as it's selected — move on again and it collapses
 *   right back, it doesn't stay pinned open the way Evaluation/Decision do below.
 * - Evaluation (phase 3) and Decision (phase 4) both expand once the *highest phase reached this
 *   session* (`maxVisitedPhase`, tracked per-viewer in `BoardView` — not board data, see the
 *   `Storage` comment in `liveblocks.config.ts`) reaches their number, and then stay expanded
 *   from then on however the selection moves after that — holding data alone isn't enough.
 *   Reaching a later phase counts for the ones before it too (landing straight on Decision, e.g.
 *   because that's where a resumed board's data is, expands Evaluation immediately, without
 *   requiring it to have been individually selected first). This is what lets Evaluation keep
 *   acting as a read-only reference alongside Decision (see `EvaluationColumn`'s `reference`
 *   prop): reaching it once pins it open for the rest of the session.
 */
export function computeColumnLayout(
  selectedPhase: Phase,
  hasData: Record<Phase, boolean>,
  maxVisitedPhase: Phase,
): Record<Phase, ColumnLayoutState> {
  const selectedNumber = phaseNumber(selectedPhase)
  const maxVisitedNumber = phaseNumber(maxVisitedPhase)
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
      ((number === 3 || number === 4) && number <= maxVisitedNumber)

    layout[key] = !expanded ? 'collapsed' : isSelected ? 'primary' : 'secondary'
  }

  return layout
}
