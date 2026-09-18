import { ClientSideSuspense } from '@liveblocks/react'
import { Center, Loader, Stack, Text } from '@mantine/core'
import { Navigate, useParams } from 'react-router-dom'
import { BoardNotFound } from '../components/board/BoardNotFound'
import { ExportView } from '../components/export/ExportView'
import { useRoomExists } from '../hooks/useRoomExists'
import { loadIdentity } from '../lib/localIdentity'
import { initialStorage, RoomProvider } from '../liveblocks.config'
import { YjsRoomProvider } from '../liveblocks-yjs/YjsRoomProvider'

/**
 * A standalone, printable read-out of a board — the Situation and the Options/Decision sections
 * (every option expanded) only, since every other phase's inputs are already summarised into the
 * latter by the time a board is worth exporting (`docs/phases.md`). Deliberately its own
 * route rather than a view toggled within `BoardPage`: it needs its own clean document (no board
 * chrome, no presence/collaboration UI) and its own print stylesheet, and a route means it can be
 * opened in a new tab, bookmarked, or driven by a headless browser later without any of that
 * living inside the interactive board's render tree.
 *
 * Joins the same Liveblocks room as `BoardPage` (read-only from this view's perspective — it
 * never mutates storage), so it reflects live data with no separate fetch/sync path.
 */
export function ExportPage() {
  const { boardId } = useParams<{ boardId: string }>()

  if (!boardId) {
    return <Navigate to="/" replace />
  }

  return <ExportRoom boardId={boardId} />
}

// Split out from `ExportPage` so `boardId` can be a plain required prop here — the existence
// check below is a hook, and `ExportPage` needs to conditionally `<Navigate>` away first when
// there's no id at all, before any hooks would run.
function ExportRoom({ boardId }: { boardId: string }) {
  const { data: exists, isLoading } = useRoomExists(boardId)
  const identity = loadIdentity()

  if (isLoading) {
    return <ExportLoadingState />
  }

  if (!exists) {
    return <BoardNotFound />
  }

  return (
    <RoomProvider
      id={boardId}
      initialStorage={() => initialStorage()}
      initialPresence={{ name: identity.name, color: identity.color }}
    >
      <ClientSideSuspense fallback={<ExportLoadingState />}>
        <YjsRoomProvider>
          <ExportView boardId={boardId} />
        </YjsRoomProvider>
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
