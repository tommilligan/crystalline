import { Text } from '@mantine/core'
import dayjs from 'dayjs'
import { useClockTick } from '../../hooks/useClockTick'

const FORMAT = 'D MMM YYYY, HH:mm:ss'

/** Ticks every second while mounted, so the passage of time is visible before signing. Shares
 * its per-second tick with `SessionTimer` via `useClockTick` so both update in the same paint. */
export function LiveClock() {
  const now = useClockTick()

  return <Text size="sm">{dayjs(now).format(FORMAT)}</Text>
}
