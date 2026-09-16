import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
    mutationFn: (summary: BoardSummary) => registerBoard(summary),
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

export function useForgetBoardEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => forgetBoardEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BOARDS_QUERY_KEY }),
  })
}
