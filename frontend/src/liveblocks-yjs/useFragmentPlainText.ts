import { useRef, useSyncExternalStore } from 'react'
import type * as Y from 'yjs'

function extractPlainText(fragment: Y.XmlFragment): string {
  return fragment
    .toString()
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Reads a Yjs XmlFragment's plain text reactively — for contexts (a `Select`'s option list, a
 * compact leaderboard row) that need a plain string rather than a full collaborative editor
 * instance per row. Takes the live fragment itself (from an `OptionData`/`DecisionData` record,
 * or `useSituationFragment`) rather than a doc-scoped name — nested fragments can't be located
 * from an id alone the way a top-level doc key could be (see `docs/local-first-mode-plan.md`). */
export function useFragmentPlainText(fragment: Y.XmlFragment): string {
  return useSyncExternalStore(
    (onStoreChange) => {
      fragment.observeDeep(onStoreChange)
      return () => fragment.unobserveDeep(onStoreChange)
    },
    () => extractPlainText(fragment),
  )
}

/** Reads several Yjs XmlFragments' plain text reactively, in the same order as `fragments` — for
 * a single component (a `Select`'s option list, an accordion header row) that needs every item's
 * text at once without calling `useFragmentPlainText` once per item in a loop, which would break
 * the rules of hooks as the option count changes. Snapshots are memoized by shallow content
 * equality so `useSyncExternalStore` doesn't see a "changed" (new-array) snapshot, and therefore
 * doesn't re-render, on every call when nothing actually changed. */
export function useFragmentPlainTexts(fragments: readonly Y.XmlFragment[]): string[] {
  const cache = useRef<string[]>([])

  return useSyncExternalStore(
    (onStoreChange) => {
      for (const fragment of fragments) fragment.observeDeep(onStoreChange)
      return () => {
        for (const fragment of fragments) fragment.unobserveDeep(onStoreChange)
      }
    },
    () => {
      const next = fragments.map(extractPlainText)
      const prev = cache.current
      const unchanged =
        prev.length === next.length && prev.every((value, index) => value === next[index])
      if (unchanged) return prev
      cache.current = next
      return next
    },
  )
}

/** Whether any of the given Yjs text fragments has content — for "has this column been touched at
 * all" checks (see `useColumnHasData`) that only need a boolean across a set of fields (e.g.
 * every option's enabler/blocker text) rather than each field's own reactive string. */
export function useAnyFragmentsNonEmpty(fragments: readonly Y.XmlFragment[]): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      for (const fragment of fragments) fragment.observeDeep(onStoreChange)
      return () => {
        for (const fragment of fragments) fragment.unobserveDeep(onStoreChange)
      }
    },
    () => fragments.some((fragment) => extractPlainText(fragment) !== ''),
  )
}
