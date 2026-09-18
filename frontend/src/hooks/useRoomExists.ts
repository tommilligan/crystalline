import { useQuery } from '@tanstack/react-query'
import { boardRoomExists } from '../lib/boardsApi'

/** Whether a board's Liveblocks room actually exists, checked before `BoardPage`/`ExportPage`
 * ever join it — a room only comes into existence via the "New board" flow (`useCreateBoard`),
 * so this is what lets those pages show "not found" for a stale or mistyped board link instead
 * of silently creating an empty room by connecting to it. */
export function useRoomExists(boardId: string) {
  return useQuery({
    queryKey: ['room-exists', boardId],
    queryFn: () => boardRoomExists(boardId),
  })
}
