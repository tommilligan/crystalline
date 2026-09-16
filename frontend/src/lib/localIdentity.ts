import { hri } from 'human-readable-ids'

const STORAGE_KEY = 'crystalline:identity'

/** This tab's locally-generated identity. There are no accounts in the MVP (see
 * `docs/mvp-scope.md`), so `id` is a random, per-session value — it's what the backend uses as
 * the Liveblocks `userId` when minting an access token (see `liveblocks.config.ts`), and what
 * distinguishes this connection's presence/caret from others'. Kept in sessionStorage (not
 * localStorage) so each browser session gets its own generated name rather than every tab on a
 * device sharing one identity. */
export interface Identity {
  id: string
  name: string
  color: string
}

function randomPresenceColor(): string {
  const colors = ['#e64980', '#7048e8', '#1c7ed6', '#0ca678', '#f08c00', '#e03131']
  return colors[Math.floor(Math.random() * colors.length)]
}

export function loadIdentity(): Identity {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Identity
  } catch {
    // sessionStorage unavailable or corrupt value — fall through to a fresh identity.
  }
  const identity: Identity = {
    id: crypto.randomUUID(),
    name: hri.random(),
    color: randomPresenceColor(),
  }
  saveIdentity(identity)
  return identity
}

export function saveIdentity(identity: Identity) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    // Best-effort persistence only.
  }
}
