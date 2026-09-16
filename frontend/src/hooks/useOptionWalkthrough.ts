import { useState } from 'react'
import type { OptionData } from '../types/board'

function lastIndexWithData(hasOptionData: readonly boolean[]): number {
  for (let index = hasOptionData.length - 1; index >= 0; index--) {
    if (hasOptionData[index]) return index
  }
  return 0
}

/**
 * Drives the "walk through each option, one at a time" flow shared by the Evaluation and
 * Scoring columns — the per-option analogue of the phase "Go to next step" flow in
 * `BoardLayout`. Which option is active is per-viewer UI state, not board data (see the
 * `Storage` comment in `liveblocks.config.ts`), so it lives in local `useState` here rather
 * than syncing between participants.
 *
 * Until the viewer explicitly picks an option (`focus`), the active one defaults to the last
 * option in `hasOptionData` that already holds this column's data — e.g. on page load, the last
 * option with Good/Bad text entered — rather than always the first, so returning to a
 * partially-worked board resumes where the team left off. That default tracks `hasOptionData` on
 * every render, so it keeps advancing as data streams in until the viewer focuses an option
 * themselves, at which point their pick sticks.
 */
export function useOptionWalkthrough(
  options: readonly OptionData[],
  hasOptionData?: readonly boolean[],
) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIndex = options.findIndex((option) => option.id === selectedId)
  const defaultIndex = hasOptionData ? lastIndexWithData(hasOptionData) : 0
  const activeIndex = selectedIndex >= 0 ? selectedIndex : defaultIndex

  return {
    activeOption: options[activeIndex] ?? null,
    nextOption: options[activeIndex + 1] ?? null,
    focus: setSelectedId,
  }
}
