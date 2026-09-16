import { Group, Text } from '@mantine/core'

/**
 * Persistently visible, per `docs/concept.md` / `docs/ui-notes.md`: the single biggest source
 * of confusion in the original whiteboard tool was an inverted cost scale with no visible
 * explanation. 1 = bad, 5 = good, on every dimension, cost or benefit — no exceptions.
 */
export function ScoreLegend() {
  return (
    <Group gap={6} wrap="nowrap">
      <Text size="xs" fw={600} c="red.7">
        1 = bad
      </Text>
      <Text size="xs" c="dimmed">
        →
      </Text>
      <Text size="xs" fw={600} c="teal.7">
        5 = good
      </Text>
      <Text size="xs" c="dimmed">
        (every dimension, costs included)
      </Text>
    </Group>
  )
}
