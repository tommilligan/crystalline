import { ClientSideSuspense } from '@liveblocks/react'
import { Center, Loader, Stack, Text } from '@mantine/core'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { BoardNotFound } from '../components/board/BoardNotFound'
import { BoardView } from '../components/board/BoardView'
import { useRoomExists } from '../hooks/useRoomExists'
import { loadIdentity } from '../lib/localIdentity'
import { initialStorage, RoomProvider } from '../liveblocks.config'
import { YjsRoomProvider } from '../liveblocks-yjs/YjsRoomProvider'

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const location = useLocation()

  if (!boardId) {
    return <Navigate to="/" replace />
  }

  const state = location.state as { title?: string } | null

  return <BoardRoom boardId={boardId} initialTitle={state?.title} />
}

// Split out from `BoardPage` so `boardId` can be a plain required prop here — the existence
// check below is a hook, and `BoardPage` needs to conditionally `<Navigate>` away first when
// there's no id at all, before any hooks would run.
function BoardRoom({ boardId, initialTitle }: { boardId: string; initialTitle?: string }) {
  const { data: exists, isLoading } = useRoomExists(boardId)
  const identity = loadIdentity()

  if (isLoading) {
    return <BoardLoadingState />
  }

  if (!exists) {
    return <BoardNotFound />
  }

  return (
    <RoomProvider
      id={boardId}
      initialStorage={() => initialStorage(initialTitle)}
      initialPresence={{ name: identity.name, color: identity.color }}
    >
      <ClientSideSuspense fallback={<BoardLoadingState />}>
        <YjsRoomProvider>
          <BoardView />
        </YjsRoomProvider>
      </ClientSideSuspense>
    </RoomProvider>
  )
}

function BoardLoadingState() {
  return (
    <Center h="100vh">
      <Stack align="center" gap="xs">
        <Loader />
        <Text c="dimmed">Connecting to board…</Text>
      </Stack>
    </Center>
  )
}
