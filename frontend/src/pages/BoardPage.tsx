import { ClientSideSuspense } from '@liveblocks/react'
import { Center, Loader, Stack, Text } from '@mantine/core'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { BoardView } from '../components/board/BoardView'
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
  const initialTitle = state?.title

  const identity = loadIdentity()

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
