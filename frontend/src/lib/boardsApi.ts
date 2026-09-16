// Same-origin path to the backend's room-deletion endpoint (see `backend/src/deleteRoom.ts`) —
// proxied by Vite in dev (`vite.config.ts`) and by a same-origin reverse proxy in prod, same
// pattern as the Liveblocks auth endpoint in `liveblocks.config.ts`.
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
