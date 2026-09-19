import { Box, Card, Group, Stack, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'
import type { PHASES } from '../../types/board'
import type { ColumnLayoutState } from './columnLayout'

interface BoardColumnShellProps {
  phase: (typeof PHASES)[number]
  layout: Exclude<ColumnLayoutState, 'hidden'>
  // Wide screens lay collapsed columns out side-by-side, so they shrink to a narrow sliver with
  // rotated text; narrow screens stack columns as full-width rows, so a collapsed column instead
  // stays full width and shrinks in height, with its label left horizontal (see `BoardLayout`).
  isWide: boolean
  onFocus: () => void
  children: ReactNode
}

/**
 * One of the four board columns. `layout` (from `computeColumnLayout`) drives how much detail it
 * gets:
 * - `primary` — the current phase. Full detail, emphasized (blue) border.
 * - `secondary` — expanded, same size and detail as primary, just a plain border — e.g. the
 *   problem statement staying readable once later phases are in progress, or Evaluation staying
 *   open as a read-only reference once Decision is selected.
 * - `collapsed` — reduced to just the phase label, for columns whose content is redundant right
 *   now (see `columnLayout.ts`). Still clickable to re-expand.
 *
 * Fully irrelevant columns aren't rendered at all — see the `hidden` filter in `BoardLayout`.
 */
export function BoardColumnShell({
  phase,
  layout,
  isWide,
  onFocus,
  children,
}: BoardColumnShellProps) {
  const collapsed = layout === 'collapsed'
  const emphasized = layout === 'primary'

  return (
    <Card
      withBorder
      padding={0}
      radius="md"
      onClickCapture={onFocus}
      style={{
        borderColor: emphasized
          ? 'var(--mantine-color-blue-5)'
          : 'var(--mantine-color-default-border)',
        borderWidth: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        transition: 'border-color 0.2s ease, flex 0.2s ease',
        cursor: collapsed ? 'pointer' : undefined,
      }}
    >
      {collapsed && isWide ? (
        <Stack align="center" justify="flex-start" gap="xs" p="xs" h="100%">
          <Title order={2} size="h5" style={{ writingMode: 'vertical-rl', whiteSpace: 'nowrap' }}>
            {phase.number}. {phase.label}
          </Title>
        </Stack>
      ) : collapsed ? (
        <Group justify="space-between" align="center" wrap="nowrap" p="sm">
          <Title order={2} size="h5">
            {phase.number}. {phase.label}
          </Title>
        </Group>
      ) : (
        <>
          <Group
            justify="space-between"
            align="flex-start"
            wrap="nowrap"
            p="sm"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <Stack gap={0}>
              <Title order={2} size="h5">
                {phase.number}. {phase.label}
              </Title>
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
