/** Body the frontend POSTs to the backend's Liveblocks auth endpoint to request an access
 * token for one room. `userId`/`userInfo` are the frontend's locally-generated identity
 * (see `useLocalIdentity` in the frontend) — there are no real accounts in the MVP. */
export interface LiveblocksAuthRequest {
  room: string
  userId: string
  userInfo: {
    name: string
    color: string
  }
}

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Board (room) ids are `crypto.randomUUID()` values minted by the frontend when a board is
 * created. The backend re-checks this shape before spending a Liveblocks API call on an
 * `authorize()` request, since the secret-backed endpoint is otherwise open to anyone who can
 * reach it. */
export function isValidRoomId(room: string): boolean {
  return UUID_V4_RE.test(room)
}
