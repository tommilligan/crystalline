import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteBoardRoom } from '../lib/boardsApi'
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
