import { Avatar, Tooltip } from '@mantine/core'
import { useOthers, useSelf } from '../../liveblocks.config'

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

/** Who else is currently in this board. Presence-only — no attribution/identity beyond a
 * self-chosen display name, per `docs/personas.md`'s note that there's no real auth in the MVP. */
export function PresenceAvatars() {
  const self = useSelf()
  const others = useOthers()

  return (
    <Avatar.Group>
      {self && (
        <Tooltip label={`${self.presence.name} (you)`}>
          <Avatar color={self.presence.color} radius="xl">
            {initials(self.presence.name)}
          </Avatar>
        </Tooltip>
      )}
      {others.map((other) => (
        <Tooltip key={other.connectionId} label={other.presence.name}>
          <Avatar color={other.presence.color} radius="xl">
            {initials(other.presence.name)}
          </Avatar>
        </Tooltip>
      ))}
    </Avatar.Group>
  )
}
