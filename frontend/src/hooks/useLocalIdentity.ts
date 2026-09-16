import { useEffect, useState } from 'react'
import { type Identity, loadIdentity, saveIdentity } from '../lib/localIdentity'
import { useUpdateMyPresence } from '../liveblocks.config'

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
