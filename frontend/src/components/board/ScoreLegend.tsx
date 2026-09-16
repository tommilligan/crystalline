import { Paper, Text } from '@mantine/core'

/**
 * Persistently visible, per `docs/concept.md` / `docs/ui-notes.md`: the single biggest source
 * of confusion in the original whiteboard tool was an inverted cost scale with no visible
 * explanation. 1 = bad, 5 = good, on every dimension, cost or benefit — no exceptions.
 */
export function ScoreLegend() {
  return (
    <Paper radius="sm" p="xs" bg="blue.0">
      <Text size="xs" fw={700} c="blue.8" ta="center">
        1 = Worst · 5 = Best (every dimension, costs included)
      </Text>
    </Paper>
  )
}
