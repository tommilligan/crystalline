import { Box, Card, Group, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'
import type { PHASES } from '../../types/board'

interface BoardColumnShellProps {
  phase: (typeof PHASES)[number]
  emphasized: boolean
  onFocus: () => void
  children: ReactNode
}

/**
 * One of the five board columns. All columns are always visible and editable regardless of
 * the current phase (see `docs/phases.md`) — `emphasized` only changes the visual weight of
 * the current one. Clicking anywhere in the column body also makes it current.
 *
 * The header is tinted with the phase's colour (matching design/figma-first-pass.png) so the
 * five columns read as distinct stages at a glance, echoing the Six Thinking Hats colours.
 */
export function BoardColumnShell({ phase, emphasized, onFocus, children }: BoardColumnShellProps) {
  return (
    <Card
      withBorder
      padding={0}
      radius="md"
      onClickCapture={onFocus}
      style={{
        borderColor: emphasized ? `var(--mantine-color-${phase.color}-5)` : undefined,
        borderWidth: emphasized ? 2 : 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Group
        justify="space-between"
        align="flex-start"
        wrap="nowrap"
        p="sm"
        bg={phase.color === 'dark' ? undefined : `${phase.color}.0`}
        style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
      >
        <Stack gap={0}>
          <Text fw={700} c={phase.color === 'dark' ? 'dark.7' : `${phase.color}.7`} size="sm">
            {phase.number}. {phase.label.toUpperCase()}
          </Text>
          <Text size="xs" c="dimmed">
            {phase.subtitle}
          </Text>
        </Stack>
        <div
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            marginTop: 4,
            flexShrink: 0,
            background:
              phase.color === 'dark'
                ? 'var(--mantine-color-dark-9)'
                : `var(--mantine-color-${phase.color}-5)`,
          }}
        />
      </Group>
      <Box style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: '70vh' }}>
        <Stack gap="sm" p="sm">
          {children}
        </Stack>
      </Box>
    </Card>
  )
}
