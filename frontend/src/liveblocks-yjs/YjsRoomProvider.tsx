import { LiveblocksYjsProvider } from '@liveblocks/yjs'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { useRoom } from '../liveblocks.config'

interface YjsContextValue {
  doc: Y.Doc
  provider: LiveblocksYjsProvider
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
    setValue({ doc, provider })

    return () => {
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
