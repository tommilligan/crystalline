import { Stack, Text, ThemeIcon } from '@mantine/core'
import { IconQuestionMark } from '@tabler/icons-react'

/** Shared empty state for Evaluation/Costs-Benefits when no options exist yet — nudges toward
 * adding options first without blocking a facilitator who wants to jump in anyway (see
 * `docs/mvp-scope.md`: phases are never locked). Standardised across both columns: same icon,
 * same title, same action text, since there's nothing column-specific to say until options
 * exist. */
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
