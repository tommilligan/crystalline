import { useState } from 'react'

function lastIndexWithData(hasData: readonly boolean[]): number {
  for (let index = hasData.length - 1; index >= 0; index--) {
    if (hasData[index]) return index
  }
  return 0
}

/**
 * Drives a "resume where you left off, then stick with whatever's explicitly picked" selection
 * over an ordered list of items — shared by the phase-level walkthrough (`BoardView`) and the
 * per-option walkthrough (`useOptionWalkthrough`).
 *
 * Until something is explicitly `focus`ed, the active item defaults to the last one (in list
 * order) that already holds data, rather than always the first — so returning to a
 * partially-worked board resumes where the team left off. That default is recomputed from
 * `hasData` on every render (self-correcting as slower-to-sync fields like Yjs text catch up)
 * right up until a key is focused, at which point the explicit pick sticks — even if `hasData`
 * changes again later, e.g. from a teammate's edits elsewhere.
 */
export function useResumableSelection<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  hasData: readonly boolean[],
): {
  active: T | null
  next: T | null
  focus: (key: string) => void
} {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const selectedIndex = items.findIndex((item) => keyOf(item) === selectedKey)
  const activeIndex = selectedIndex >= 0 ? selectedIndex : lastIndexWithData(hasData)

  return {
    active: items[activeIndex] ?? null,
    next: items[activeIndex + 1] ?? null,
    focus: setSelectedKey,
  }
}
