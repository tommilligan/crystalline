import { ClientSideSuspense } from '@liveblocks/react'
import { Center, Loader, Stack, Text } from '@mantine/core'
import { Navigate, useParams } from 'react-router-dom'
import { BoardView } from '../components/board/BoardView'
import { initialStorage, RoomProvider, randomPresenceColor } from '../liveblocks.config'
import { YjsRoomProvider } from '../liveblocks-yjs/YjsRoomProvider'

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()

  if (!boardId) {
    return <Navigate to="/" replace />
  }

  return (
    <RoomProvider
      id={boardId}
      initialStorage={initialStorage}
      initialPresence={{ name: 'Anonymous', color: randomPresenceColor() }}
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
