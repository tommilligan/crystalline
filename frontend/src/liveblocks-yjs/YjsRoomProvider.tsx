import { LiveblocksYjsProvider } from '@liveblocks/yjs'
import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react'
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
 */
export function YjsRoomProvider({ children }: { children: ReactNode }) {
  const room = useRoom()

  const value = useMemo<YjsContextValue>(() => {
    const doc = new Y.Doc()
    const provider = new LiveblocksYjsProvider(room, doc)
    return { doc, provider }
  }, [room])

  useEffect(() => {
    return () => {
      value.provider.destroy()
      value.doc.destroy()
    }
  }, [value])

  return <YjsContext.Provider value={value}>{children}</YjsContext.Provider>
}

export function useYjsDoc(): YjsContextValue {
  const ctx = useContext(YjsContext)
  if (!ctx) {
    throw new Error('useYjsDoc must be used within a YjsRoomProvider')
  }
  return ctx
}
