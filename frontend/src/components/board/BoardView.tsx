import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core'
import { IconCopy, IconCrystalBall, IconDownload, IconLock, IconPencil } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSetTitle, useUnsignBoard } from '../../hooks/useBoardMutations'
import {
  useBoardDecision,
  useBoardLifecycle,
  useBoardOptions,
  useBoardTitle,
} from '../../hooks/useBoardState'
import { useRegisterBoard } from '../../hooks/useBoardsRegistry'
import { useColumnHasData } from '../../hooks/useColumnHasData'
import { useLocalIdentity } from '../../hooks/useLocalIdentity'
import { useRoom } from '../../liveblocks.config'
import { PHASES, type Phase, nextPhase as phaseAfter } from '../../types/board'
import { BoardLayout } from './BoardLayout'
import { DecisionColumn } from './columns/DecisionColumn'
import { EvaluationColumn } from './columns/EvaluationColumn'
import { OptionsColumn } from './columns/OptionsColumn'
import { ScoringColumn } from './columns/ScoringColumn'
import { SituationColumn } from './columns/SituationColumn'
import { PresenceAvatars } from './PresenceAvatars'

/** The last phase (in phase order) that already holds data, or `situation` if none does — what
 * a freshly loaded board should focus, so reopening a partially-worked board resumes where the
 * team left off instead of always landing back on the first phase. */
function highestDataPhase(hasData: Record<Phase, boolean>): Phase {
  let result: Phase = 'situation'
  for (const { key } of PHASES) {
    if (hasData[key]) result = key
  }
  return result
}

/** Click-to-edit board title: shows as plain text with a pencil affordance until clicked, then
 * becomes a focused input so it's obvious the name can be renamed without always looking like a
 * form field. */
function BoardTitleEditor({
  title,
  onChange,
  disabled,
}: {
  title: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (editing) {
    return (
      <TextInput
        ref={inputRef}
        value={title}
        onChange={(event) => onChange(event.currentTarget.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') setEditing(false)
        }}
        styles={{ input: { fontWeight: 600, fontSize: 'var(--mantine-font-size-lg)' } }}
        aria-label="Board title"
      />
    )
  }

  return (
    <Group
      gap={6}
      align="center"
      wrap="nowrap"
      onClick={() => !disabled && setEditing(true)}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
    >
      <Text fw={600} size="lg">
        {title || 'Untitled board'}
      </Text>
      {!disabled && (
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label="Edit board title"
          onClick={(event) => {
            event.stopPropagation()
            setEditing(true)
          }}
        >
          <IconPencil size={14} />
        </ActionIcon>
      )}
    </Group>
  )
}

export function BoardView() {
  const room = useRoom()
  const title = useBoardTitle()
  // Which phase/column is emphasized is per-viewer UI state, not shared board data — each
  // participant can be looking at a different column without dragging everyone else's view
  // along with them. See the comment on `Storage` in `liveblocks.config.ts`.
  const [phase, setPhase] = useState<Phase>('situation')
  const lifecycle = useBoardLifecycle()
  const options = useBoardOptions()
  const decision = useBoardDecision()
  const hasData = useColumnHasData(options, decision)
  const setTitle = useSetTitle()
  const unsignBoard = useUnsignBoard()
  const registerBoard = useRegisterBoard()
  const { identity, setName } = useLocalIdentity()

  const signed = lifecycle.state === 'signed'

  // Keep the home page's local board list in sync with the live title, so a rename here shows
  // up there too. This registry is a client-side pointer/cache only — see `lib/boardsRegistry.ts`.
  useEffect(() => {
    registerBoard.mutate({ id: room.id, title, createdAt: Date.now() })
  }, [room.id, title, registerBoard.mutate])

  // On a fresh load, jump straight to whichever phase the team last left off at, rather than
  // always opening on Situation — resuming a partially-worked board should show its progress.
  // This keeps tracking `hasData` (self-correcting as slower-to-sync fields like Yjs text catch
  // up) only until the viewer picks a phase themselves, at which point `focusPhase` freezes it so
  // a teammate's later edits elsewhere don't yank the view out from under them.
  const hasFocusedManually = useRef(false)
  useEffect(() => {
    if (hasFocusedManually.current) return
    setPhase(highestDataPhase(hasData))
  }, [hasData])

  function focusPhase(next: Phase) {
    hasFocusedManually.current = true
    setPhase(next)
  }

  // Each column advances via a single "Next >" button that it owns and places itself (right
  // after its own next-option step, if it has one, else after its content) — see `NextButton`.
  // `active` gates whether it's shown at all: a column not currently selected never shows a
  // Next button or per-item focus styling, even if it remembers which item was selected.
  function advanceFrom(phase: Phase): (() => void) | undefined {
    const next = phaseAfter(phase)
    return next ? () => focusPhase(next) : undefined
  }

  const columns: Record<Phase, ReactNode> = {
    situation: (
      <SituationColumn
        disabled={signed}
        active={phase === 'situation'}
        onAdvancePhase={advanceFrom('situation')}
      />
    ),
    ideation: (
      <OptionsColumn
        options={options}
        disabled={signed}
        active={phase === 'ideation'}
        onAdvancePhase={advanceFrom('ideation')}
      />
    ),
    evaluation: (
      <EvaluationColumn
        options={options}
        disabled={signed}
        active={phase === 'evaluation'}
        onAdvancePhase={advanceFrom('evaluation')}
      />
    ),
    scoring: (
      <ScoringColumn
        options={options}
        disabled={signed}
        active={phase === 'scoring'}
        onAdvancePhase={advanceFrom('scoring')}
      />
    ),
    decision: (
      <DecisionColumn
        options={options}
        decision={decision}
        signed={signed}
        signedAt={lifecycle.signedAt}
        disabled={signed}
      />
    ),
  }

  return (
    <Container size="xl" px="md" py="md">
      <Stack gap="md">
        {signed && lifecycle.signedAt && (
          <Alert color="green" radius="sm" icon={<IconLock size={18} />} p="xs">
            <Group justify="space-between" wrap="wrap" gap="xs">
              <Text size="sm" fw={600} c="green.9">
                Decision signed by {decision.approvedBy || 'an approver'} on{' '}
                {dayjs(lifecycle.signedAt).format('YYYY-MM-DD')} — Board locked.
              </Text>
              <Group gap="xs">
                <Button
                  component={Link}
                  to={`/board/${room.id}/export`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="default"
                  size="xs"
                  leftSection={<IconDownload size={14} />}
                >
                  Export
                </Button>
                <Tooltip label="Not implemented in this scaffold">
                  <Button size="xs" leftSection={<IconCopy size={14} />} disabled>
                    Clone Board
                  </Button>
                </Tooltip>
                {import.meta.env.DEV && (
                  <Tooltip label="Dev-only: reverts sign-off so this room can be reused for testing">
                    <Button size="xs" variant="subtle" color="red" onClick={() => unsignBoard()}>
                      Unlock (dev)
                    </Button>
                  </Tooltip>
                )}
              </Group>
            </Group>
          </Alert>
        )}

        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="md" align="center" wrap="nowrap">
            <Anchor component={Link} to="/" underline="never" c="inherit" aria-label="Crystal Ball home">
              <ThemeIcon size={32} radius="xl" variant="light" color="blue">
                <IconCrystalBall size={18} />
              </ThemeIcon>
            </Anchor>

            <BoardTitleEditor title={title} onChange={setTitle} disabled={signed} />
          </Group>

          <Group gap="sm">
            <Button
              component={Link}
              to={`/board/${room.id}/export`}
              target="_blank"
              rel="noopener noreferrer"
              variant="default"
              size="xs"
              leftSection={<IconDownload size={14} />}
            >
              Export
            </Button>
            <PresenceAvatars />
            <TextInput
              size="xs"
              w={140}
              placeholder="Your name"
              value={identity.name}
              onChange={(event) => setName(event.currentTarget.value)}
              aria-label="Your display name"
            />
          </Group>
        </Group>

        {signed && (
          <Text c="dimmed" size="sm">
            This board is signed and read-only. Clone it to make further changes.
          </Text>
        )}

        <BoardLayout
          currentPhase={phase}
          onFocusPhase={focusPhase}
          hasData={hasData}
          columns={columns}
        />
      </Stack>
    </Container>
  )
}
