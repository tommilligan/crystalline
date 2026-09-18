import { useQuery } from '@tanstack/react-query'
import { localBoardExists } from '../local-board/localBoardStore'

/** Whether a local-only board's IndexedDB record actually exists on this device — checked before
 * `BoardPage`/`ExportPage` ever mount `LocalBoardDocProvider` for it, mirroring `useRoomExists`
 * for sharable mode. A local board has no server to ask, so "not found" is simply "this device's
 * IndexedDB has no record under this id" (see `local-board/localBoardStore.ts`). */
export function useLocalBoardExists(boardId: string) {
  return useQuery({
    queryKey: ['local-board-exists', boardId],
    queryFn: () => localBoardExists(boardId),
  })
}
