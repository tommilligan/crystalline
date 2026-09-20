import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Center,
  Group,
  Menu,
  Modal,
  Paper,
  Select,
  type SelectProps,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCloud,
  IconCrystalBall,
  IconDeviceFloppy,
  IconDots,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBoardsList, useCreateBoard, useDeleteBoard } from '../hooks/useBoardsRegistry'
import { formatRelativeTime } from '../lib/date'
import type { BoardMode, BoardSummary } from '../types/board'

const MODE_OPTIONS: ReadonlyArray<{
  value: BoardMode
  label: string
  description: string
  icon: typeof IconDeviceFloppy
}> = [
  {
    value: 'local',
    label: 'This device',
    description: 'Data never leaves your machine. Cannot be shared.',
    icon: IconDeviceFloppy,
  },
  {
    value: 'shared',
    label: 'Sharable',
    description: 'Synced live via Liveblocks — anyone with the link can join.',
    icon: IconCloud,
  },
]

// Sharable mode is dev-only for now (not offered in production) — see
// `docs/local-first-mode-plan.md`. The selector itself is always visible, but outside dev it
// only ever offers 'local', so `mode` state below can never become 'shared' in production.
const AVAILABLE_MODE_OPTIONS = import.meta.env.DEV
  ? MODE_OPTIONS
  : MODE_OPTIONS.filter((option) => option.value === 'local')

const renderModeOption: NonNullable<SelectProps['renderOption']> = ({ option, checked }) => {
  const item = MODE_OPTIONS.find((entry) => entry.value === option.value)
  const Icon = item?.icon ?? IconDeviceFloppy
  return (
    <Group flex="1" gap="sm" wrap="nowrap">
      <Icon size={20} style={{ flexShrink: 0 }} />
      <div>
        <Text size="sm" fw={500}>
          {option.label}
        </Text>
        <Text size="xs" opacity={0.6}>
          {item?.description}
        </Text>
      </div>
      {checked && <IconCheck size={16} style={{ marginInlineStart: 'auto', flexShrink: 0 }} />}
    </Group>
  )
}

type SortKey = 'title' | 'updatedAt'

export function HomePage() {
  const { data: boards, isLoading } = useBoardsList()
  const createBoard = useCreateBoard()
  const deleteBoard = useDeleteBoard()
  const navigate = useNavigate()
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<BoardMode>('local')
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BoardSummary | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const selectedModeOption = MODE_OPTIONS.find((option) => option.value === mode) ?? MODE_OPTIONS[0]
  const SelectedModeIcon = selectedModeOption.icon

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'title' ? 'asc' : 'desc')
    }
  }

  const sortedBoards = useMemo(() => {
    if (!boards) return []
    const compared = [...boards].sort((a, b) =>
      sortKey === 'title' ? a.title.localeCompare(b.title) : a.updatedAt - b.updatedAt,
    )
    return sortDir === 'asc' ? compared : compared.reverse()
  }, [boards, sortKey, sortDir])

  function handleDeleteConfirm() {
    if (!deleteTarget) return
    setDeleteError(null)
    deleteBoard.mutate(
      { id: deleteTarget.id, mode: deleteTarget.mode },
      {
        onSuccess: () => setDeleteTarget(null),
        onError: () => setDeleteError('Could not delete this board. Please try again.'),
      },
    )
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setCreateError(null)
    const id = crypto.randomUUID()
    const boardTitle = title.trim() || 'Untitled board'
    // `mode` can already never be 'shared' outside dev (see `AVAILABLE_MODE_OPTIONS`) — re-assert
    // it here as a safety net.
    const boardMode: BoardMode = import.meta.env.DEV ? mode : 'local'
    createBoard.mutate(
      { id, title: boardTitle, createdAt: Date.now(), mode: boardMode },
      {
        onSuccess: () => {
          closeModal()
          navigate(`/board/${id}`, { state: { title: boardTitle } })
        },
        onError: () => setCreateError('Could not create this board. Please try again.'),
      },
    )
  }

  return (
    <Center mih="100vh">
      <Stack gap="xl" w={560} px="md" py="xl">
        <Stack gap={4} align="center" ta="center">
          <Title order={1}>Crystal Ball</Title>
          <Text c="dimmed">Make good decisions efficiently.</Text>
        </Stack>

        <Group justify="center">
          <Button leftSection={<IconPlus size={16} />} onClick={openModal}>
            New board
          </Button>
        </Group>

        <Stack gap="sm">
          <Title order={2}>Your boards</Title>
          {isLoading && <Text c="dimmed">Loading…</Text>}
          {!isLoading && boards?.length === 0 && (
            <Text c="dimmed">No boards yet on this device.</Text>
          )}
          {boards && boards.length > 0 && (
            <Paper withBorder radius="md">
              <Table verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>
                      <SortableHeader
                        label="Name"
                        active={sortKey === 'title'}
                        direction={sortDir}
                        onClick={() => toggleSort('title')}
                      />
                    </Table.Th>
                    <Table.Th>
                      <SortableHeader
                        label="Updated"
                        active={sortKey === 'updatedAt'}
                        direction={sortDir}
                        onClick={() => toggleSort('updatedAt')}
                      />
                    </Table.Th>
                    <Table.Th w={1} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sortedBoards.map((board) => (
                    <Table.Tr key={board.id}>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          <Anchor component={Link} to={`/board/${board.id}`} fw={500}>
                            {board.title}
                          </Anchor>
                          {import.meta.env.DEV && (
                            <Badge
                              size="xs"
                              variant="light"
                              color={board.mode === 'shared' ? 'blue' : 'gray'}
                            >
                              {board.mode}
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {formatRelativeTime(board.updatedAt)}
                        </Text>
                      </Table.Td>
                      <Table.Td w={1}>
                        <Menu position="bottom-end" withinPortal>
                          <Menu.Target>
                            <ActionIcon variant="subtle" color="gray" aria-label="Board actions">
                              <IconDots size={16} />
                            </ActionIcon>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Item
                              color="red"
                              leftSection={<IconTrash size={14} />}
                              onClick={() => {
                                setDeleteError(null)
                                setDeleteTarget(board)
                              }}
                            >
                              Delete board
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
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
                New Board
              </Text>
            </Stack>

            <TextInput
              w="100%"
              label="Board title"
              placeholder="e.g. next work social"
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              styles={{ label: { width: '100%', textAlign: 'left' } }}
            />

            <Select
              w="100%"
              label="Stored on"
              data={AVAILABLE_MODE_OPTIONS.map(({ value, label }) => ({ value, label }))}
              value={mode}
              onChange={(value) => value && setMode(value as BoardMode)}
              allowDeselect={false}
              leftSection={<SelectedModeIcon size={16} />}
              renderOption={renderModeOption}
              styles={{ label: { width: '100%', textAlign: 'left' } }}
            />

            {createError && (
              <Text size="sm" c="red">
                {createError}
              </Text>
            )}

            <Group justify="flex-end" w="100%">
              <Button variant="default" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={createBoard.isPending}>
                Create Board
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete board"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Delete <strong>{deleteTarget?.title}</strong>? This permanently deletes the board so
            anyone else with the link loses access too.
            <br />
          </Text>
          <Text size="sm">This action cannot be undone.</Text>
          {deleteError && (
            <Text size="sm" c="red">
              {deleteError}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button color="red" loading={deleteBoard.isPending} onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Center>
  )
}

interface SortableHeaderProps {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
}

function SortableHeader({ label, active, direction, onClick }: SortableHeaderProps) {
  const Icon = direction === 'asc' ? IconChevronUp : IconChevronDown
  return (
    <UnstyledButton onClick={onClick}>
      <Group gap={4} wrap="nowrap">
        <Text size="sm" fw={700} c={active ? undefined : 'dimmed'}>
          {label}
        </Text>
        {active && <Icon size={14} />}
      </Group>
    </UnstyledButton>
  )
}
