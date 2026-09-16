#!/usr/bin/env -S npx tsx
import { checkbox, confirm } from '@inquirer/prompts'
import { liveblocks } from '../liveblocksClient.js'

/**
 * Interactive admin CLI for listing and deleting Liveblocks rooms (boards) directly against the
 * Liveblocks project, using the same secret key as the backend server (`backend/.env`). This is
 * an operator tool, not part of the webapp: the app itself has no "list every room" capability
 * (see the comment on `lib/boardsRegistry.ts` in the frontend — the public client key can't list
 * rooms, only a server holding the secret key can), and even the app's own board-deletion flow
 * only ever deletes one room a user already has open, not an arbitrary one.
 *
 * Usage: `npm run manage-rooms -w backend`
 */

interface RoomSummary {
  id: string
  title: string
  lastUpdated: Date
}

// Liveblocks doesn't expose a room's board title directly (`RoomData` has no such field — see
// `getRooms`/`iterRooms` in `@liveblocks/node`); it lives inside the room's own Storage document,
// alongside everything else in `liveblocks.config.ts`'s `Storage` type. A handful of storage
// fetches at a time keeps this responsive without hammering the API.
const STORAGE_FETCH_CONCURRENCY = 5

async function fetchTitle(roomId: string): Promise<string> {
  try {
    const storage = await liveblocks.getStorageDocument(roomId, 'json')
    const title = (storage as { title?: unknown }).title
    return typeof title === 'string' && title.trim() ? title : '(untitled board)'
  } catch {
    return '(storage unavailable)'
  }
}

async function fetchRooms(): Promise<RoomSummary[]> {
  const rooms: { id: string; lastUpdated: Date }[] = []
  for await (const room of liveblocks.iterRooms({})) {
    // `lastConnectionAt` is the closest proxy Liveblocks exposes for "last touched" — there's no
    // true content-modification timestamp on `RoomData` itself. Falls back to `createdAt` for a
    // room nobody has ever connected to.
    rooms.push({ id: room.id, lastUpdated: room.lastConnectionAt ?? room.createdAt })
  }

  const withTitles: RoomSummary[] = []
  for (let i = 0; i < rooms.length; i += STORAGE_FETCH_CONCURRENCY) {
    const batch = rooms.slice(i, i + STORAGE_FETCH_CONCURRENCY)
    const titles = await Promise.all(batch.map((room) => fetchTitle(room.id)))
    batch.forEach((room, index) => {
      withTitles.push({ ...room, title: titles[index] })
    })
  }

  withTitles.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
  return withTitles
}

async function main() {
  console.log('Fetching rooms…')
  const rooms = await fetchRooms()

  if (rooms.length === 0) {
    console.log('No rooms found.')
    return
  }

  const selected = await checkbox<string>({
    message: `${rooms.length} room(s), most recently updated first. Space to select, enter to confirm:`,
    pageSize: 20,
    choices: rooms.map((room) => ({
      name: `${room.lastUpdated.toLocaleString().padEnd(22)} ${room.title.padEnd(30)} ${room.id}`,
      value: room.id,
    })),
  })

  if (selected.length === 0) {
    console.log('Nothing selected — exiting without changes.')
    return
  }

  console.log('')
  console.log('About to permanently delete:')
  for (const id of selected) {
    const room = rooms.find((candidate) => candidate.id === id)
    console.log(`  - ${room?.title ?? id} (${id})`)
  }
  console.log('')

  const proceed = await confirm({
    message: `Permanently delete ${selected.length} room(s)? This cannot be undone.`,
    default: false,
  })

  if (!proceed) {
    console.log('Cancelled — no rooms were deleted.')
    return
  }

  for (const id of selected) {
    await liveblocks.deleteRoom(id)
    console.log(`Deleted ${id}`)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
