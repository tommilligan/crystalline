import { useEffect, useState } from 'react'
import { randomPresenceColor, useUpdateMyPresence } from '../liveblocks.config'

const STORAGE_KEY = 'crystalline:identity'

interface Identity {
  name: string
  color: string
}

function loadIdentity(): Identity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Identity
  } catch {
    // localStorage unavailable or corrupt value — fall through to a fresh identity.
  }
  const identity: Identity = { name: 'Facilitator', color: randomPresenceColor() }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    // Best-effort persistence only.
  }
  return identity
}

function saveIdentity(identity: Identity) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    // Best-effort persistence only.
  }
}

/** Applies a locally-persisted display name/colour to this connection's Liveblocks presence,
 * so avatars and collaboration carets have something stable to show across visits. */
export function useLocalIdentity() {
  const [identity, setIdentityState] = useState<Identity>(loadIdentity)
  const updateMyPresence = useUpdateMyPresence()

  useEffect(() => {
    updateMyPresence({ name: identity.name, color: identity.color })
  }, [identity.name, identity.color, updateMyPresence])

  function setName(name: string) {
    const next = { ...identity, name: name.trim() || 'Facilitator' }
    setIdentityState(next)
    saveIdentity(next)
  }

  return { identity, setName }
}
