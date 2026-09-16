import { useState } from 'react'
import type { OptionData } from '../types/board'

/**
 * Drives the "walk through each option, one at a time" flow shared by the Evaluation and
 * Scoring columns — the per-option analogue of the phase "Go to next step" flow in
 * `BoardLayout`. Which option is active is per-viewer UI state, not board data (see the
 * `Storage` comment in `liveblocks.config.ts`), so it lives in local `useState` here rather
 * than syncing between participants.
 */
export function useOptionWalkthrough(options: readonly OptionData[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedIndex = options.findIndex((option) => option.id === selectedId)
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0

  return {
    activeOption: options[activeIndex] ?? null,
    nextOption: options[activeIndex + 1] ?? null,
    focus: setSelectedId,
  }
}
