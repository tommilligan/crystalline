import { ClientSideSuspense } from '@liveblocks/react'
import { Center, Loader, Stack, Text } from '@mantine/core'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { BoardNotFound } from '../components/board/BoardNotFound'
import { BoardView } from '../components/board/BoardView'
import { useBoardsList } from '../hooks/useBoardsRegistry'
import { useLocalBoardExists } from '../hooks/useLocalBoardExists'
import { useRoomExists } from '../hooks/useRoomExists'
import { loadIdentity } from '../lib/localIdentity'
import { RoomProvider } from '../liveblocks.config'
import { BoardDocProvider } from '../liveblocks-yjs/BoardDocProvider'
import { LocalBoardDocProvider } from '../local-board/LocalBoardDocProvider'

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const location = useLocation()

  if (!boardId) {
    return <Navigate to="/" replace />
  }

  const state = location.state as { title?: string } | null

  return <BoardRoom boardId={boardId} initialTitle={state?.title} />
}

// Split out from `BoardPage` so `boardId` can be a plain required prop here — the mode lookup
// below is a hook, and `BoardPage` needs to conditionally `<Navigate>` away first when there's no
// id at all, before any hooks would run.
function BoardRoom({ boardId, initialTitle }: { boardId: string; initialTitle?: string }) {
  // Which backend to mount is looked up from this device's local board registry (see
  // `docs/local-first-mode-plan.md`'s "Board mode: registry, creation, routing") — a local board
  // exists only in this device's IndexedDB, so there's nothing else to ask. A board this device
  // has never seen before (registry lookup finds nothing, e.g. a sharable link opened cold) falls
  // through to the sharable path below, which is the only one with a server to check against.
  const { data: boards, isLoading: registryLoading } = useBoardsList()

  if (registryLoading) {
    return <BoardLoadingState />
  }

  const mode = boards?.find((board) => board.id === boardId)?.mode

  if (mode === 'local') {
    return <LocalBoardRoom boardId={boardId} initialTitle={initialTitle} />
  }

  return <SharedBoardRoom boardId={boardId} initialTitle={initialTitle} />
}

function LocalBoardRoom({ boardId, initialTitle }: { boardId: string; initialTitle?: string }) {
  const { data: exists, isLoading } = useLocalBoardExists(boardId)

  if (isLoading) {
    return <BoardLoadingState />
  }

  if (!exists) {
    return <BoardNotFound />
  }

  return (
    <LocalBoardDocProvider boardId={boardId} initialTitle={initialTitle}>
      <BoardView boardId={boardId} mode="local" />
    </LocalBoardDocProvider>
  )
}

function SharedBoardRoom({ boardId, initialTitle }: { boardId: string; initialTitle?: string }) {
  const { data: exists, isLoading } = useRoomExists(boardId)
  const identity = loadIdentity()

  if (isLoading) {
    return <BoardLoadingState />
  }

  if (!exists) {
    return <BoardNotFound />
  }

  return (
    <RoomProvider id={boardId} initialPresence={{ name: identity.name, color: identity.color }}>
      <ClientSideSuspense fallback={<BoardLoadingState />}>
        <BoardDocProvider initialTitle={initialTitle}>
          <BoardView boardId={boardId} mode="shared" />
        </BoardDocProvider>
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
