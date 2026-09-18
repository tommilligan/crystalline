import { ClientSideSuspense } from '@liveblocks/react'
import { Center, Loader, Stack, Text } from '@mantine/core'
import { Navigate, useParams } from 'react-router-dom'
import { BoardNotFound } from '../components/board/BoardNotFound'
import { ExportView } from '../components/export/ExportView'
import { useBoardsList } from '../hooks/useBoardsRegistry'
import { useLocalBoardExists } from '../hooks/useLocalBoardExists'
import { useRoomExists } from '../hooks/useRoomExists'
import { loadIdentity } from '../lib/localIdentity'
import { RoomProvider } from '../liveblocks.config'
import { BoardDocProvider } from '../liveblocks-yjs/BoardDocProvider'
import { LocalBoardDocProvider } from '../local-board/LocalBoardDocProvider'

/**
 * A standalone, printable read-out of a board — the Situation and the Options/Decision sections
 * (every option expanded) only, since every other phase's inputs are already summarised into the
 * latter by the time a board is worth exporting (`docs/phases.md`). Deliberately its own
 * route rather than a view toggled within `BoardPage`: it needs its own clean document (no board
 * chrome, no presence/collaboration UI) and its own print stylesheet, and a route means it can be
 * opened in a new tab, bookmarked, or driven by a headless browser later without any of that
 * living inside the interactive board's render tree.
 *
 * Reads the same board data `BoardPage` does — a local board's `Y.Doc` via IndexedDB, or the same
 * Liveblocks room via `@liveblocks/yjs` — chosen the same way `BoardPage` chooses it (see
 * `BoardRoom` below); this view never mutates either.
 */
export function ExportPage() {
  const { boardId } = useParams<{ boardId: string }>()

  if (!boardId) {
    return <Navigate to="/" replace />
  }

  return <BoardRoom boardId={boardId} />
}

// Same registry-lookup routing as `pages/BoardPage.tsx`'s `BoardRoom` — see its comment.
function BoardRoom({ boardId }: { boardId: string }) {
  const { data: boards, isLoading: registryLoading } = useBoardsList()

  if (registryLoading) {
    return <ExportLoadingState />
  }

  const mode = boards?.find((board) => board.id === boardId)?.mode

  if (mode === 'local') {
    return <LocalExportRoom boardId={boardId} />
  }

  return <SharedExportRoom boardId={boardId} />
}

function LocalExportRoom({ boardId }: { boardId: string }) {
  const { data: exists, isLoading } = useLocalBoardExists(boardId)

  if (isLoading) {
    return <ExportLoadingState />
  }

  if (!exists) {
    return <BoardNotFound />
  }

  return (
    <LocalBoardDocProvider boardId={boardId}>
      <ExportView boardId={boardId} />
    </LocalBoardDocProvider>
  )
}

function SharedExportRoom({ boardId }: { boardId: string }) {
  const { data: exists, isLoading } = useRoomExists(boardId)
  const identity = loadIdentity()

  if (isLoading) {
    return <ExportLoadingState />
  }

  if (!exists) {
    return <BoardNotFound />
  }

  return (
    <RoomProvider id={boardId} initialPresence={{ name: identity.name, color: identity.color }}>
      <ClientSideSuspense fallback={<ExportLoadingState />}>
        <BoardDocProvider>
          <ExportView boardId={boardId} />
        </BoardDocProvider>
      </ClientSideSuspense>
    </RoomProvider>
  )
}

function ExportLoadingState() {
  return (
    <Center h="100vh">
      <Stack align="center" gap="xs">
        <Loader />
        <Text c="dimmed">Preparing export…</Text>
      </Stack>
    </Center>
  )
}
