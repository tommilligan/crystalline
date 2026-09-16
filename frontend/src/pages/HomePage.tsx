import {
  ActionIcon,
  Anchor,
  Button,
  Center,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconCrystalBall, IconPlus } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBoardsList, useForgetBoardEntry, useRegisterBoard } from '../hooks/useBoardsRegistry'

const TEMPLATES = [{ value: 'standard-five-phase', label: 'Standard Five-Phase Board' }]

export function HomePage() {
  const { data: boards, isLoading } = useBoardsList()
  const registerBoard = useRegisterBoard()
  const forgetBoard = useForgetBoardEntry()
  const navigate = useNavigate()
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [title, setTitle] = useState('')
  const [template, setTemplate] = useState<string | null>(TEMPLATES[0].value)

  function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    const id = crypto.randomUUID()
    registerBoard.mutate(
      { id, title: title.trim() || 'Untitled board', createdAt: Date.now() },
      {
        onSuccess: () => {
          closeModal()
          navigate(`/board/${id}`)
        },
      },
    )
  }

  return (
    <Center mih="100vh" bg="gray.0">
      <Stack gap="xl" w={420} py="xl">
        <Stack gap={4} align="center" ta="center">
          <Title order={1}>Crystal Ball</Title>
          <Text c="dimmed">
            A structured, five-phase decision-making board — situation, options, evaluation,
            scoring, decision.
          </Text>
        </Stack>

        <Group justify="center">
          <Button leftSection={<IconPlus size={16} />} onClick={openModal}>
            New board
          </Button>
        </Group>

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
            <Paper withBorder radius="md">
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
            </Paper>
          )}
        </Stack>
      </Stack>

      <Modal opened={modalOpened} onClose={closeModal} centered withCloseButton={false} size="sm">
        <form onSubmit={handleCreate}>
          <Stack gap="md" align="center" ta="center">
            <ThemeIcon size={48} radius="xl" variant="light" color="blue">
              <IconCrystalBall size={24} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={3}>Crystal Ball</Title>
              <Text c="dimmed" size="sm">
                New Board from Template
              </Text>
            </Stack>

            <Paper w="100%" p="sm" radius="sm" bg="blue.0">
              <Text size="xs" fw={700} c="blue.8">
                FIVE-PHASE METHOD
              </Text>
              <Text size="xs" c="blue.9">
                Structure complex debates into five modular operational phases. Avoid concurrent
                arguments by aligning team perspectives on a shared vector.
              </Text>
            </Paper>

            <TextInput
              w="100%"
              label="Board title"
              placeholder="e.g. OD Test Sample Reintegration"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              styles={{ label: { width: '100%', textAlign: 'left' } }}
            />

            <Select
              w="100%"
              label="Select template"
              data={TEMPLATES}
              value={template}
              onChange={setTemplate}
              allowDeselect={false}
              styles={{ label: { width: '100%', textAlign: 'left' } }}
            />

            <Group justify="flex-end" w="100%">
              <Button variant="default" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={registerBoard.isPending}>
                Create Board
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Center>
  )
}
