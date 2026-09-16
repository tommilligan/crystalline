import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBoardsList, useForgetBoardEntry, useRegisterBoard } from '../hooks/useBoardsRegistry'

export function HomePage() {
  const { data: boards, isLoading } = useBoardsList()
  const registerBoard = useRegisterBoard()
  const forgetBoard = useForgetBoardEntry()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')

  function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    const id = crypto.randomUUID()
    registerBoard.mutate(
      { id, title: title.trim() || 'Untitled board', createdAt: Date.now() },
      { onSuccess: () => navigate(`/board/${id}`) },
    )
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={1}>Crystal Ball</Title>
          <Text c="dimmed">
            A structured, five-phase decision-making board — situation, options, evaluation,
            scoring, decision.
          </Text>
        </Stack>

        <Card withBorder padding="lg">
          <form onSubmit={handleCreate}>
            <Stack gap="sm">
              <Title order={3}>New board</Title>
              <TextInput
                label="Title"
                placeholder="e.g. OD Test Sample Reintegration"
                value={title}
                onChange={(event) => setTitle(event.currentTarget.value)}
              />
              <Group justify="flex-end">
                <Button type="submit" loading={registerBoard.isPending}>
                  Create board
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>

        <Stack gap="sm">
          <Title order={3}>Your boards</Title>
          {isLoading && <Text c="dimmed">Loading…</Text>}
          {!isLoading && boards?.length === 0 && (
            <Text c="dimmed">
              No boards yet on this device. Boards opened elsewhere aren't listed here — share the
              board link directly instead.
            </Text>
          )}
          {boards && boards.length > 0 && (
            <Table verticalSpacing="xs">
              <Table.Tbody>
                {boards.map((board) => (
                  <Table.Tr key={board.id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/board/${board.id}`} fw={500}>
                        {board.title}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {new Date(board.createdAt).toLocaleDateString()}
                      </Text>
                    </Table.Td>
                    <Table.Td w={1}>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="Remove from this list"
                        onClick={() => forgetBoard.mutate(board.id)}
                      >
                        ✕
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Stack>
    </Container>
  )
}
