import type { LiveblocksAuthRequest } from '@crystalline/shared'
import { createClient, LiveList, LiveObject } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'
import { loadIdentity } from './lib/localIdentity'
import type {
  DecisionData,
  LifecycleState,
  OptionData,
  RatingProperty,
  TimerState,
} from './types/board'
import { DEFAULT_RATING_PROPERTIES, DEFAULT_TIMER_DURATION_MS } from './types/board'

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

/** Ephemeral per-connection presence: who's here, shown in avatars and collaboration carets. */
export type Presence = {
  name: string
  color: string
}

/** Persisted, synced board state. Free-text fields (idea/enabler/blocker/situation/
 * countermeasure/dissent) are intentionally excluded here — they live as collaboratively
 * edited Yjs text fragments (see `YjsRoomProvider`), keyed by the field helpers in
 * `types/board.ts`. This split lets structured fields (scores, lifecycle) use Liveblocks
 * Storage directly while free text gets fine-grained, per-keystroke merging. The currently
 * *focused* phase/column is deliberately not here — that's per-viewer UI state (see
 * `BoardView`'s local `useState`), not shared data, so one person clicking into a column
 * doesn't drag everyone else's view along with it. */
export type Storage = {
  title: string
  lifecycleState: LifecycleState
  signedAt: string | null
  options: LiveList<LiveObject<OptionData>>
  /** The numeric properties every option is rated against in the Evaluation column, in display
   * order — shared board configuration, editable via that column's properties picker. See
   * `RatingProperty` in `types/board.ts`. */
  ratingProperties: LiveList<LiveObject<RatingProperty>>
  decision: LiveObject<DecisionData>
  timer: LiveObject<TimerState>
  /** Whether the team has confirmed consensus on the situation phase's problem statement — the
   * gate on leaving column 1 (`docs/phases.md`). Resets to `false` whenever the problem
   * statement text changes, since agreement was on that specific wording. */
  situationAgreed: boolean
}

const context = createRoomContext<Presence, Storage>(client)

export const { RoomProvider, useRoom, useMutation, useOthers, useUpdateMyPresence, useStatus } =
  context

// `useStorage`/`useSelf` are taken from the suspense bundle: every board is rendered inside a
// `ClientSideSuspense` (see `pages/BoardPage.tsx`), so these can be relied on to never return
// null instead of every call site having to narrow an "still loading" case that can't happen.
export const { useStorage, useSelf } = context.suspense

export function initialStorage(title: string = 'Untitled board'): Storage {
  return {
    title,
    lifecycleState: 'active',
    signedAt: null,
    options: new LiveList([]),
    ratingProperties: new LiveList(
      DEFAULT_RATING_PROPERTIES.map((property) => new LiveObject(property)),
    ),
    decision: new LiveObject({
      chosenOptionId: null,
      approvedBy: null,
      date: null,
      nextStep: null,
      owner: null,
      deadline: null,
    }),
    timer: new LiveObject({
      status: 'idle',
      durationMs: DEFAULT_TIMER_DURATION_MS,
      remainingMs: DEFAULT_TIMER_DURATION_MS,
      endsAt: null,
    }),
    situationAgreed: false,
  }
}
