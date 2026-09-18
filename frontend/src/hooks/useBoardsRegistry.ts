import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBoardRoom, deleteBoardRoom } from '../lib/boardsApi'
import {
  forgetBoardEntry,
  listBoards,
  registerBoard,
  renameBoardEntry,
} from '../lib/boardsRegistry'
import { createLocalBoardDoc, deleteLocalBoardData } from '../local-board/localBoardStore'
import type { BoardSummary } from '../types/board'

const BOARDS_QUERY_KEY = ['boards'] as const

export function useBoardsList() {
  return useQuery({ queryKey: BOARDS_QUERY_KEY, queryFn: listBoards })
}

/** Creates a board outright: its backing store — a Liveblocks room for `'shared'`, or a
 * self-contained local `Y.Doc` persisted to IndexedDB for `'local'` (see
 * `local-board/localBoardStore.ts`) — plus this device's local list entry. `mode` is chosen once
 * here and never changes for the board's lifetime (`lib/boardsRegistry.ts`). This is what "New
 * board" on the home page calls; mirrors `useDeleteBoard` below. */
export function useCreateBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (summary: Pick<BoardSummary, 'id' | 'title' | 'createdAt' | 'mode'>) => {
      if (summary.mode === 'shared') {
        await createBoardRoom(summary.id)
      } else {
        await createLocalBoardDoc(summary.id, summary.title)
      }
      await registerBoard(summary)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOARDS_QUERY_KEY }),
  })
}

export function useRegisterBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (summary: Pick<BoardSummary, 'id' | 'title' | 'createdAt' | 'mode'>) =>
      registerBoard(summary),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOARDS_QUERY_KEY }),
  })
}

export function useRenameBoardEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => renameBoardEntry(id, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOARDS_QUERY_KEY }),
  })
}

/** Deletes a board outright: its actual data (a Liveblocks room for `'shared'`, this device's
 * IndexedDB record for `'local'`) plus this device's local list entry. Takes the board's `mode`
 * from the caller (the home page already has the full `BoardSummary` in hand from the list it's
 * rendering) rather than looking it up itself. */
export function useDeleteBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, mode }: Pick<BoardSummary, 'id' | 'mode'>) => {
      if (mode === 'shared') {
        await deleteBoardRoom(id)
      } else {
        await deleteLocalBoardData(id)
      }
      await forgetBoardEntry(id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOARDS_QUERY_KEY }),
  })
}
