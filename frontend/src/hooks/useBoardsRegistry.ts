import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBoardRoom, deleteBoardRoom } from '../lib/boardsApi'
import {
  forgetBoardEntry,
  listBoards,
  registerBoard,
  renameBoardEntry,
} from '../lib/boardsRegistry'
import type { BoardSummary } from '../types/board'

const BOARDS_QUERY_KEY = ['boards'] as const

export function useBoardsList() {
  return useQuery({ queryKey: BOARDS_QUERY_KEY, queryFn: listBoards })
}

/** Creates a board outright: its Liveblocks room (the only place a room is allowed to come into
 * existence — see `lib/boardsApi.ts`) plus this device's local list entry. This is what "New
 * board" on the home page calls; mirrors `useDeleteBoard` below. */
export function useCreateBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (summary: Pick<BoardSummary, 'id' | 'title' | 'createdAt'>) => {
      await createBoardRoom(summary.id)
      await registerBoard(summary)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOARDS_QUERY_KEY }),
  })
}

export function useRegisterBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (summary: Pick<BoardSummary, 'id' | 'title' | 'createdAt'>) =>
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

/** Deletes a board outright: its Liveblocks room (the actual data — see `lib/boardsApi.ts`)
 * plus this device's local list entry. */
export function useDeleteBoard() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteBoardRoom(id)
      await forgetBoardEntry(id)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOARDS_QUERY_KEY }),
  })
}
