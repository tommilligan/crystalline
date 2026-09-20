import type { LiveblocksAuthRequest } from '@crystalline/shared'
import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'
import { loadIdentity } from './lib/localIdentity'

// Path to the backend's Liveblocks auth endpoint (see `backend/src/liveblocksAuth.ts`). Relative
// by default so Vite's dev proxy (`vite.config.ts`) and a same-origin reverse proxy in prod both
// just work; override with a full URL if the backend is deployed on a different origin.
const authEndpoint = import.meta.env.VITE_LIVEBLOCKS_AUTH_ENDPOINT ?? '/api/liveblocks-auth'

const client = createClient({
  // The client calls this on every room connect *and* automatically again to refresh the token
  // before it expires — no manual refresh/polling needed here.
  authEndpoint: async (room) => {
    const identity = loadIdentity()
    const body: LiveblocksAuthRequest = {
      room: room ?? '',
      userId: identity.id,
      userInfo: { name: identity.name, color: identity.color },
    }
    const response = await fetch(authEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(`Liveblocks auth failed: ${response.status}`)
    }
    return response.json()
  },
})

/** Ephemeral per-connection presence: who's here, shown in avatars and collaboration carets.
 * Sharable-mode only — see `docs/local-first-mode-plan.md`'s "Multiplayer-only UI, gated by
 * mode". There is no more Liveblocks `Storage` type: every persisted board field (structured and
 * free text alike) now lives in the one `Y.Doc` described in `lib/boardDoc.ts`, synced purely as
 * an opaque Yjs binary via `liveblocks-yjs/BoardDocProvider.tsx` — Liveblocks Storage APIs
 * (`LiveObject`/`LiveList`/`useMutation`/`useStorage`) aren't used at all going forward. */
type Presence = {
  name: string
  color: string
}

const context = createRoomContext<Presence>(client)

export const { RoomProvider, useRoom, useOthers, useUpdateMyPresence } = context

// `useSelf` is taken from the suspense bundle: every board is rendered inside a
// `ClientSideSuspense` (see `pages/BoardPage.tsx`), so it can be relied on to never return null
// instead of every call site having to narrow an "still loading" case that can't happen.
export const { useSelf } = context.suspense
