import { Stack, Text, ThemeIcon } from '@mantine/core'
import { IconQuestionMark } from '@tabler/icons-react'

/** Shared empty state for the Evaluation column when no options exist yet — nudges toward
 * adding options first without blocking a facilitator who wants to jump in anyway (see
 * `docs/mvp-scope.md`: phases are never locked). */
export function EmptyColumnState() {
  return (
    <Stack align="center" gap="xs" py="md">
      <ThemeIcon size={40} radius="xl" color="gray.3" variant="light">
        <IconQuestionMark size={20} color="var(--mantine-color-gray-6)" />
      </ThemeIcon>
      <Text fw={700} size="sm" ta="center">
        No Options Yet
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        Click the Options column to add a new option.
      </Text>
    </Stack>
  )
}
