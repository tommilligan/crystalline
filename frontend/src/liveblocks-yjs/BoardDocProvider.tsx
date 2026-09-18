import { LiveblocksYjsProvider } from '@liveblocks/yjs'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import * as Y from 'yjs'
import { BoardDocContext } from '../board-doc/BoardDocContext'
import { createBoardDoc } from '../lib/boardDoc'
import { useRoom } from '../liveblocks.config'

interface InternalValue {
  doc: Y.Doc
  provider: LiveblocksYjsProvider
  synced: boolean
}

/** The `LiveblocksYjsProvider` instance for the current board, when one exists — only populated
 * in sharable mode (see `BoardDocProvider` below). `CollaborativeTextField` reads this
 * (`useOptionalLiveblocksYjsProvider`) to decide whether to show collaboration cursors at all;
 * `null` in local-only mode, where there's no concept of other participants. */
const LiveblocksYjsProviderContext = createContext<LiveblocksYjsProvider | null>(null)

export function useOptionalLiveblocksYjsProvider(): LiveblocksYjsProvider | null {
  return useContext(LiveblocksYjsProviderContext)
}

/**
 * Sharable-mode backend for the board's `Y.Doc` context (see `board-doc/BoardDocContext.tsx`):
 * one `Y.Doc` + one `LiveblocksYjsProvider` per room, synced over the network through Liveblocks,
 * shared by every collaborative text field and every mutation/read hook in that room. The
 * local-only counterpart is `local-board/LocalBoardDocProvider.tsx` — both populate the same
 * `BoardDocContext`, so hooks built against it work identically in either mode.
 *
 * Creation lives in the effect (not `useMemo`) so that React 18 StrictMode's dev-only
 * mount->cleanup->remount cycle recreates a fresh doc/provider pair on remount instead of
 * leaving children holding a cached pair whose cleanup already ran — a destroyed doc keeps
 * accepting local edits (so typing still looks like it works) but its listener that forwards
 * updates to Liveblocks has been torn down, so nothing ever syncs.
 *
 * Seeds the doc with the board's initial shape (`createBoardDoc`) once first synced — the Yjs
 * replacement for what `RoomProvider`'s `initialStorage` prop used to do for native Storage.
 * `createBoardDoc` is idempotent, so this is safe even if two participants both connect to a
 * freshly-created room at nearly the same moment.
 */
export function BoardDocProvider({
  children,
  initialTitle,
}: {
  children: ReactNode
  initialTitle?: string
}) {
  const room = useRoom()
  const [value, setValue] = useState<InternalValue | null>(null)

  useEffect(() => {
    const doc = new Y.Doc()
    const provider = new LiveblocksYjsProvider(room, doc)

    const handleSync = (synced: boolean) => {
      if (synced) createBoardDoc(doc, initialTitle)
      setValue((current) => (current ? { ...current, synced } : current))
    }
    provider.on('sync', handleSync)
    setValue({ doc, provider, synced: provider.synced })
    if (provider.synced) createBoardDoc(doc, initialTitle)

    return () => {
      provider.off('sync', handleSync)
      provider.destroy()
      doc.destroy()
      setValue(null)
    }
  }, [room, initialTitle])

  if (!value) return null

  return (
    <BoardDocContext.Provider value={value}>
      <LiveblocksYjsProviderContext.Provider value={value.provider}>
        {children}
      </LiveblocksYjsProviderContext.Provider>
    </BoardDocContext.Provider>
  )
}
