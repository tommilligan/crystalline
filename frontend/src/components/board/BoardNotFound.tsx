import { Button, Center, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'

/** Shown by `BoardPage`/`ExportPage` when a board id's Liveblocks room doesn't exist — a stale
 * link to a deleted board, a mistyped id, or a link that was never a real board to begin with.
 * Rooms only come into existence via the "New board" flow, so this is the intended outcome of
 * visiting anything else, not a loading/error edge case to paper over. */
export function BoardNotFound() {
  return (
    <Center h="100vh">
      <Stack align="center" gap="xs">
        <Title order={2}>Board not found</Title>
        <Text c="dimmed" ta="center" maw={360}>
          This board doesn't exist — it may have been deleted, or the link may be incorrect.
        </Text>
        <Button component={Link} to="/" mt="sm">
          Back to home
        </Button>
      </Stack>
    </Center>
  )
}
