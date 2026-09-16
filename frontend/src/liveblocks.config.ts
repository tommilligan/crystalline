import { createClient, LiveList, LiveObject } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'
import type { DecisionData, LifecycleState, OptionData, Phase } from './types/board'

const publicApiKey = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY as string | undefined

if (!publicApiKey) {
  console.warn(
    '[crystalline] VITE_LIVEBLOCKS_PUBLIC_KEY is not set. Copy .env.example to .env and add ' +
      'a Liveblocks public API key (https://liveblocks.io/dashboard/apiKeys) to enable sync.',
  )
}

const client = createClient({
  publicApiKey: publicApiKey ?? 'pk_missing_key',
})

/** Ephemeral per-connection presence: who's here, shown in avatars and collaboration carets. */
export type Presence = {
  name: string
  color: string
}

/** Persisted, synced board state. Free-text fields (idea/enabler/blocker/situation/
 * countermeasure/dissent) are intentionally excluded here — they live as collaboratively
 * edited Yjs text fragments (see `YjsRoomProvider`), keyed by the field helpers in
 * `types/board.ts`. This split lets structured fields (scores, phase, lifecycle) use
 * Liveblocks Storage directly while free text gets fine-grained, per-keystroke merging. */
export type Storage = {
  title: string
  currentPhase: Phase
  lifecycleState: LifecycleState
  signedAt: string | null
  options: LiveList<LiveObject<OptionData>>
  decision: LiveObject<DecisionData>
}

const context = createRoomContext<Presence, Storage>(client)

export const { RoomProvider, useRoom, useMutation, useOthers, useUpdateMyPresence, useStatus } =
  context

// `useStorage`/`useSelf` are taken from the suspense bundle: every board is rendered inside a
// `ClientSideSuspense` (see `pages/BoardPage.tsx`), so these can be relied on to never return
// null instead of every call site having to narrow an "still loading" case that can't happen.
export const { useStorage, useSelf } = context.suspense

export function initialStorage(): Storage {
  return {
    title: 'Untitled board',
    currentPhase: 'situation',
    lifecycleState: 'active',
    signedAt: null,
    options: new LiveList([]),
    decision: new LiveObject({ chosenOptionId: null, approvedBy: null, date: null }),
  }
}

const PRESENCE_COLORS = ['#e64980', '#7048e8', '#1c7ed6', '#0ca678', '#f08c00', '#e03131']

export function randomPresenceColor(): string {
  return PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)]
}
