import { useSyncExternalStore } from 'react'
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
