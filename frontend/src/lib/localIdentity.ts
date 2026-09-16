const STORAGE_KEY = 'crystalline:identity'

/** This device's locally-generated identity. There are no accounts in the MVP (see
 * `docs/mvp-scope.md`), so `id` is a random, per-browser value — it's what the backend uses as
 * the Liveblocks `userId` when minting an access token (see `liveblocks.config.ts`), and what
 * distinguishes this connection's presence/caret from others'. */
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
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Identity
  } catch {
    // localStorage unavailable or corrupt value — fall through to a fresh identity.
  }
  const identity: Identity = {
    id: crypto.randomUUID(),
    name: 'Facilitator',
    color: randomPresenceColor(),
  }
  saveIdentity(identity)
  return identity
}

export function saveIdentity(identity: Identity) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    // Best-effort persistence only.
  }
}
