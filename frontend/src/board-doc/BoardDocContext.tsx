import { createContext, useContext } from 'react'
import type * as Y from 'yjs'

export interface BoardDocContextValue {
  doc: Y.Doc
  /** Whether the backend has finished loading this board's persisted state at least once. Every
   * shared type reads as empty until this flips to `true` — code that reacts to a value
   * *changing* (as opposed to just reading it) needs to ignore that initial empty->loaded
   * transition, or it'll mistake "the persisted document just arrived" for "someone edited it
   * just now" (see `SituationColumn`'s agreement-reset effect). */
  synced: boolean
}

/**
 * The mode-agnostic `{ doc, synced }` context every mutation/read hook and `CollaborativeTextField`
 * consume, regardless of which backend actually populates it — see
 * `liveblocks-yjs/BoardDocProvider.tsx` (sharable, Liveblocks-backed) and
 * `local-board/LocalBoardDocProvider.tsx` (local-only, IndexedDB-backed). Both providers populate
 * this same context, so every hook built against it works identically in both modes (see
 * `docs/local-first-mode-plan.md`).
 */
export const BoardDocContext = createContext<BoardDocContextValue | null>(null)

export function useBoardDoc(): BoardDocContextValue {
  const ctx = useContext(BoardDocContext)
  if (!ctx) {
    throw new Error('useBoardDoc must be used within a BoardDocProvider or LocalBoardDocProvider')
  }
  return ctx
}

/** Whether the board's persisted document has finished its initial load — see `synced` on
 * `BoardDocContextValue`. */
export function useBoardSynced(): boolean {
  return useBoardDoc().synced
}
