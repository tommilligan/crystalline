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
