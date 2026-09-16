import { useRef, useSyncExternalStore } from 'react'
import type * as Y from 'yjs'
import { useYjsDoc } from './YjsRoomProvider'

function extractPlainText(fragment: Y.XmlFragment): string {
  return fragment
    .toString()
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Reads a Yjs XmlFragment's plain text reactively — for contexts (a `Select`'s option list, a
 * compact leaderboard row) that need a plain string rather than a full collaborative editor
 * instance per row. */
export function useFragmentPlainText(field: string): string {
  const { doc } = useYjsDoc()

  return useSyncExternalStore(
    (onStoreChange) => {
      const fragment = doc.getXmlFragment(field)
      fragment.observeDeep(onStoreChange)
      return () => fragment.unobserveDeep(onStoreChange)
    },
    () => extractPlainText(doc.getXmlFragment(field)),
  )
}

/** Reads several Yjs XmlFragments' plain text reactively, in the same order as `fields` — for a
 * single component (a `Select`'s option list, an accordion header row) that needs every item's
 * text at once without calling `useFragmentPlainText` once per item in a loop, which would break
 * the rules of hooks as the option count changes. Snapshots are memoized by shallow content
 * equality so `useSyncExternalStore` doesn't see a "changed" (new-array) snapshot, and therefore
 * doesn't re-render, on every call when nothing actually changed. */
export function useFragmentPlainTexts(fields: readonly string[]): string[] {
  const { doc } = useYjsDoc()
  const cache = useRef<string[]>([])

  return useSyncExternalStore(
    (onStoreChange) => {
      const fragments = fields.map((field) => doc.getXmlFragment(field))
      for (const fragment of fragments) fragment.observeDeep(onStoreChange)
      return () => {
        for (const fragment of fragments) fragment.unobserveDeep(onStoreChange)
      }
    },
    () => {
      const next = fields.map((field) => extractPlainText(doc.getXmlFragment(field)))
      const prev = cache.current
      const unchanged =
        prev.length === next.length && prev.every((value, index) => value === next[index])
      if (unchanged) return prev
      cache.current = next
      return next
    },
  )
}

/** Whether any of the given Yjs text fields has content — for "has this column been touched at
 * all" checks (see `useColumnHasData`) that only need a boolean across a set of fields (e.g.
 * every option's enabler/blocker text) rather than each field's own reactive string. */
export function useAnyFragmentsNonEmpty(fields: readonly string[]): boolean {
  const { doc } = useYjsDoc()

  return useSyncExternalStore(
    (onStoreChange) => {
      const fragments = fields.map((field) => doc.getXmlFragment(field))
      for (const fragment of fragments) fragment.observeDeep(onStoreChange)
      return () => {
        for (const fragment of fragments) fragment.unobserveDeep(onStoreChange)
      }
    },
    () => fields.some((field) => extractPlainText(doc.getXmlFragment(field)) !== ''),
  )
}
