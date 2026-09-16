import { Card, ScrollArea, Stack, Title } from '@mantine/core'
import type { ReactNode } from 'react'

interface BoardColumnShellProps {
  title: string
  emphasized: boolean
  onFocus: () => void
  children: ReactNode
}

/**
 * One of the five board columns. All columns are always visible and editable regardless of
 * the current phase (see `docs/phases.md`) — `emphasized` only changes the visual weight of
 * the current one. Clicking anywhere in the column body also makes it current.
 */
export function BoardColumnShell({ title, emphasized, onFocus, children }: BoardColumnShellProps) {
  return (
    <Card
      withBorder
      padding="md"
      onClickCapture={onFocus}
      style={{
        borderColor: emphasized ? 'var(--mantine-color-blue-5)' : undefined,
        borderWidth: emphasized ? 2 : 1,
        opacity: emphasized ? 1 : 0.9,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Title order={4} mb="sm">
        {title}
      </Title>
      <ScrollArea.Autosize mah="70vh" offsetScrollbars>
        <Stack gap="sm">{children}</Stack>
      </ScrollArea.Autosize>
    </Card>
  )
}
