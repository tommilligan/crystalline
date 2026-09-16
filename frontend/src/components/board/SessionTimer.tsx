import { ActionIcon, Group, Paper, Stack, Text } from '@mantine/core'
import { IconPlayerPause, IconPlayerPlay, IconRefresh } from '@tabler/icons-react'
import { usePauseTimer, useResetTimer, useStartTimer } from '../../hooks/useBoardMutations'
import { useBoardTimer } from '../../hooks/useBoardState'
import { useClockTick } from '../../hooks/useClockTick'

function format(totalMs: number): string {
  const totalSeconds = Math.ceil(totalMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

interface SessionTimerProps {
  disabled?: boolean
}

/**
 * Advisory countdown for the facilitator's usual 15–20 minute time-box on this phase
 * (`docs/ui-notes.md`). Shared across every client in the room via Liveblocks Storage
 * (`root.timer`), which is the single source of truth: start/pause/reset write it, and it's
 * still purely advisory — it never disables or advances anything on expiry.
 *
 * The countdown itself never touches the network: `endsAt` is the one epoch-ms target Storage
 * holds while running, and each client re-renders every second purely locally, via the shared
 * `useClockTick` (see there) so this ticks in lockstep with `LiveClock` instead of drifting
 * against it.
 */
export function SessionTimer({ disabled }: SessionTimerProps) {
  const timer = useBoardTimer()
  const start = useStartTimer()
  const pause = usePauseTimer()
  const reset = useResetTimer()

  const now = useClockTick()

  const remainingMs =
    timer.status === 'running' && timer.endsAt !== null
      ? Math.max(0, timer.endsAt - now)
      : timer.remainingMs

  const running = timer.status === 'running'

  return (
    <Paper
      withBorder
      radius="sm"
      p="sm"
      bg="yellow.0"
      style={{ borderColor: 'var(--mantine-color-yellow-3)' }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={0}>
          <Text size="xs" fw={700} c="yellow.9">
            SESSION TIMER
          </Text>
          <Text size="xl" fw={700} ff="monospace">
            {format(remainingMs)}
          </Text>
        </Stack>
        <Stack gap={4} align="flex-end">
          <Text size="xs" c="dimmed">
            advisory only
          </Text>
          <Group gap={4}>
            <ActionIcon
              variant="subtle"
              color="yellow.9"
              aria-label={running ? 'Pause timer' : 'Start timer'}
              disabled={disabled}
              onClick={() => (running ? pause() : start())}
            >
              {running ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="yellow.9"
              aria-label="Reset timer"
              disabled={disabled}
              onClick={() => reset()}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Group>
        </Stack>
      </Group>
    </Paper>
  )
}
