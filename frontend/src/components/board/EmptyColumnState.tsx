import { Box, Stack, Text, ThemeIcon } from '@mantine/core'
import type { Icon, IconProps } from '@tabler/icons-react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'

interface EmptyColumnStateProps {
  icon: ForwardRefExoticComponent<IconProps & RefAttributes<Icon>>
  title: string
  description: string
  placeholder: string
}

/** Shared empty state for Evaluation/Costs-Benefits when no options exist yet — nudges toward
 * adding options first without blocking a facilitator who wants to jump in anyway (see
 * `docs/mvp-scope.md`: phases are never locked). */
export function EmptyColumnState({
  icon: Icon,
  title,
  description,
  placeholder,
}: EmptyColumnStateProps) {
  return (
    <Stack align="center" gap="xs" py="md">
      <ThemeIcon size={40} radius="xl" color="gray.3" variant="light">
        <Icon size={20} color="var(--mantine-color-gray-6)" />
      </ThemeIcon>
      <Text fw={700} size="sm" ta="center">
        {title}
      </Text>
      <Text size="xs" c="dimmed" ta="center">
        {description}
      </Text>
      <Box
        w="100%"
        py="sm"
        style={{
          border: '1px dashed var(--mantine-color-gray-4)',
          borderRadius: 'var(--mantine-radius-sm)',
        }}
      >
        <Text size="xs" c="dimmed" ta="center">
          {placeholder}
        </Text>
      </Box>
    </Stack>
  )
}
