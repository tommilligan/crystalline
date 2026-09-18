import { LiveblocksYjsProvider } from '@liveblocks/yjs'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { useRoom } from '../liveblocks.config'

interface YjsContextValue {
  doc: Y.Doc
  provider: LiveblocksYjsProvider
  /** Whether `provider` has finished loading the room's persisted Yjs state at least once.
   * Every fragment reads as empty until this flips to `true` — code that reacts to a fragment's
   * text *changing* (as opposed to just reading it) needs to ignore that initial empty->loaded
   * transition, or it'll mistake "the persisted document just arrived" for "someone edited it
   * just now" (see `SituationColumn`'s agreement-reset effect). */
  synced: boolean
}

const YjsContext = createContext<YjsContextValue | null>(null)

/**
 * One Y.Doc + one LiveblocksYjsProvider per room, shared by every collaborative text field in
 * that room. Individual fields address their own content via a distinct Y.XmlFragment name
 * (see `CollaborativeTextField`) rather than each field owning its own doc/provider pair.
 *
 * Creation lives in the effect (not `useMemo`) so that React 18 StrictMode's dev-only
 * mount->cleanup->remount cycle recreates a fresh doc/provider pair on remount instead of
 * leaving children holding a `useMemo`-cached pair that the cleanup already destroyed — a
 * destroyed doc keeps accepting local edits (so typing still looks like it works) but its
 * listener that forwards updates to Liveblocks has been torn down, so nothing ever syncs.
 */
export function YjsRoomProvider({ children }: { children: ReactNode }) {
  const room = useRoom()
  const [value, setValue] = useState<YjsContextValue | null>(null)

  useEffect(() => {
    const doc = new Y.Doc()
    const provider = new LiveblocksYjsProvider(room, doc)

    const handleSync = (synced: boolean) => {
      setValue((current) => (current ? { ...current, synced } : current))
    }
    provider.on('sync', handleSync)
    setValue({ doc, provider, synced: provider.synced })

    return () => {
      provider.off('sync', handleSync)
      provider.destroy()
      doc.destroy()
      setValue(null)
    }
  }, [room])

  if (!value) return null

  return <YjsContext.Provider value={value}>{children}</YjsContext.Provider>
}

export function useYjsDoc(): YjsContextValue {
  const ctx = useContext(YjsContext)
  if (!ctx) {
    throw new Error('useYjsDoc must be used within a YjsRoomProvider')
  }
  return ctx
}

/** Whether the room's persisted Yjs document has finished its initial load — see `synced` on
 * `YjsContextValue`. */
export function useYjsSynced(): boolean {
  return useYjsDoc().synced
}
