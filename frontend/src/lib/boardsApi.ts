// Same-origin path to the backend's room endpoints (see `backend/src/createRoom.ts`,
// `getRoom.ts`, `deleteRoom.ts`) — proxied by Vite in dev (`vite.config.ts`) and by a
// same-origin reverse proxy in prod, same pattern as the Liveblocks auth endpoint in
// `liveblocks.config.ts`.
const roomsEndpoint = '/api/rooms'

/**
 * Deletes a board's Liveblocks room outright — its options, scores, decision, and collaborative
 * text, not just this device's "my boards" list entry. Irreversible, and visible to anyone else
 * with the board link, so callers must confirm with the user first.
 */
export async function deleteBoardRoom(id: string): Promise<void> {
  const response = await fetch(`${roomsEndpoint}/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error(`Failed to delete board: ${response.status}`)
  }
}

/**
 * Creates a board's Liveblocks room. This is the only thing that's allowed to bring a room into
 * existence — called once from the "New board" flow, before navigating to the board, so the
 * room already exists by the time `BoardPage` connects to it. See `backend/src/createRoom.ts`.
 */
export async function createBoardRoom(id: string): Promise<void> {
  const response = await fetch(roomsEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create board: ${response.status}`)
  }
}

/**
 * Whether a board's Liveblocks room actually exists — checked before ever joining it, so
 * visiting a stale or mistyped board link shows "not found" instead of silently joining (and
 * thereby creating) an empty room. See `backend/src/getRoom.ts`.
 */
export async function boardRoomExists(id: string): Promise<boolean> {
  const response = await fetch(`${roomsEndpoint}/${id}`)
  if (response.status === 404) {
    return false
  }
  if (!response.ok) {
    throw new Error(`Failed to check board: ${response.status}`)
  }
  return true
}
