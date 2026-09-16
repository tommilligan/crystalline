import { Box, Button, Card, Group, Stack, Text } from '@mantine/core'
import { IconChevronRight } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import type { PHASES } from '../../types/board'

interface BoardColumnShellProps {
  phase: (typeof PHASES)[number]
  emphasized: boolean
  onFocus: () => void
  onAdvance?: () => void
  children: ReactNode
}

/**
 * One of the five board columns. All columns are always visible and editable regardless of
 * the current phase (see `docs/phases.md`) — `emphasized` only changes the visual weight of
 * the current one. Clicking anywhere in the column body also makes it current.
 */
export function BoardColumnShell({
  phase,
  emphasized,
  onFocus,
  onAdvance,
  children,
}: BoardColumnShellProps) {
  return (
    <Card
      withBorder
      padding={0}
      radius="md"
      onClickCapture={onFocus}
      style={{
        borderColor: emphasized ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-3)',
        borderWidth: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        opacity: emphasized ? 1 : 0.55,
        transition: 'opacity 0.2s ease, border-color 0.2s ease',
      }}
    >
      <Group
        justify="space-between"
        align="flex-start"
        wrap="nowrap"
        p="sm"
        bg="white"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
      >
        <Stack gap={0}>
          <Text fw={700} c="dark.7" size="sm">
            {phase.number}. {phase.label}
          </Text>
          <Text size="xs" c="dimmed">
            {phase.subtitle}
          </Text>
        </Stack>
      </Group>
      <Box style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: '70vh' }}>
        <Stack gap="sm" p="sm">
          {children}
          {emphasized && onAdvance && (
            <Button
              variant="light"
              color="blue"
              fullWidth
              rightSection={<IconChevronRight size={16} />}
              onClick={(event) => {
                event.stopPropagation()
                onAdvance()
              }}
            >
              Go to next step
            </Button>
          )}
        </Stack>
      </Box>
    </Card>
  )
}
