import { Box, Card, Group, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'
import type { PHASES } from '../../types/board'
import type { ColumnLayoutState } from './columnLayout'

interface BoardColumnShellProps {
  phase: (typeof PHASES)[number]
  layout: Exclude<ColumnLayoutState, 'hidden'>
  onFocus: () => void
  children: ReactNode
}

/**
 * One of the five board columns. `layout` (from `computeColumnLayout`) drives how much space
 * and detail it gets:
 * - `primary` — the current phase. Full detail, most of the row's width.
 * - `secondary` — expanded (full detail) but not current, e.g. the problem statement staying
 *   readable once later phases are in progress.
 * - `collapsed` — reduced to a narrow sliver with just the rotated phase label, for columns
 *   whose content is redundant right now (see `columnLayout.ts`). Still clickable to re-expand.
 *
 * Fully irrelevant columns aren't rendered at all — see the `hidden` filter in `BoardLayout`.
 */
export function BoardColumnShell({ phase, layout, onFocus, children }: BoardColumnShellProps) {
  const collapsed = layout === 'collapsed'
  const emphasized = layout === 'primary'

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
        height: '100%',
        minHeight: 0,
        opacity: emphasized || collapsed ? 1 : 0.55,
        transition: 'opacity 0.2s ease, border-color 0.2s ease, flex 0.2s ease',
        cursor: collapsed ? 'pointer' : undefined,
      }}
    >
      {collapsed ? (
        <Stack align="center" justify="flex-start" gap="xs" p="xs" h="100%">
          <Text
            fw={700}
            c="dark.7"
            size="sm"
            style={{ writingMode: 'vertical-rl', whiteSpace: 'nowrap' }}
          >
            {phase.number}. {phase.label}
          </Text>
        </Stack>
      ) : (
        <>
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
            </Stack>
          </Box>
        </>
      )}
    </Card>
  )
}
