import type { JSX } from 'react'
import { type ReactNode, useEffect, useState } from 'react'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { BoardDocContext, type BoardDocContextValue } from '../board-doc/BoardDocContext'
import { createBoardDoc } from '../lib/boardDoc'
import { localBoardDbName } from './localBoardStore'

/**
 * Local-only (IndexedDB-backed) provider for the board's `Y.Doc` context — the counterpart
 * to `liveblocks-yjs/BoardDocProvider.tsx` in sharable mode. Both populate the same
 * `BoardDocContext`, so hooks and components built against it work identically in either mode.
 *
 * Creation lives in the effect (not `useMemo`) so that React 18 StrictMode's dev-only
 * mount->cleanup->remount cycle recreates a fresh doc/persistence pair on remount instead of
 * leaving children holding a cached pair whose cleanup already ran — a destroyed doc keeps
 * accepting local edits (so typing still looks like it works) but its listener that forwards
 * updates to IndexedDB has been torn down, so nothing ever persists.
 *
 * Seeds the doc with the board's initial shape (`createBoardDoc`) once the IndexedDB load
 * completes (after `.whenSynced`). `createBoardDoc` is idempotent, so this is safe even if
 * the board was already fully seeded by `createLocalBoardDoc` before this provider mounts.
 */
export function LocalBoardDocProvider({
  boardId,
  initialTitle,
  children,
}: {
  boardId: string
  initialTitle?: string
  children: ReactNode
}): JSX.Element | null {
  const [value, setValue] = useState<BoardDocContextValue | null>(null)

  useEffect(() => {
    let cancelled = false
    let persistence: IndexeddbPersistence | null = null
    let doc: Y.Doc | null = null

    async function initializeDoc() {
      doc = new Y.Doc()
      persistence = new IndexeddbPersistence(localBoardDbName(boardId), doc)

      try {
        // Wait for the IndexedDB load to complete
        await persistence.whenSynced

        // Guard against this callback running after unmount or re-effect
        if (cancelled) {
          return
        }

        // Seed the doc with initial shape (idempotent, safe defense-in-depth)
        createBoardDoc(doc, initialTitle)

        // Set the context value
        setValue({
          doc,
          synced: true, // IndexedDB is local, no network sync — we're ready immediately
        })
      } catch (error) {
        // If something goes wrong during initialization, clean up
        if (!cancelled && persistence && doc) {
          await persistence.destroy()
          doc.destroy()
        }
        throw error
      }
    }

    initializeDoc()

    return () => {
      cancelled = true
      if (persistence && doc) {
        persistence.destroy()
        doc.destroy()
      }
      setValue(null)
    }
  }, [boardId, initialTitle])

  if (!value) return null

  return <BoardDocContext.Provider value={value}>{children}</BoardDocContext.Provider>
}
