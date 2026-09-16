import { Badge, Button, Container, Group, Stack, Text, TextInput, Tooltip } from '@mantine/core'
import { type ReactNode, useEffect } from 'react'
import { useSetPhase, useSetTitle, useUnsignBoard } from '../../hooks/useBoardMutations'
import {
  useBoardDecision,
  useBoardLifecycle,
  useBoardOptions,
  useBoardPhase,
  useBoardTitle,
} from '../../hooks/useBoardState'
import { useRegisterBoard } from '../../hooks/useBoardsRegistry'
import { useLocalIdentity } from '../../hooks/useLocalIdentity'
import { useRoom } from '../../liveblocks.config'
import type { Phase } from '../../types/board'
import { BoardLayout } from './BoardLayout'
import { DecisionColumn } from './columns/DecisionColumn'
import { EvaluationColumn } from './columns/EvaluationColumn'
import { OptionsColumn } from './columns/OptionsColumn'
import { ScoringColumn } from './columns/ScoringColumn'
import { SituationColumn } from './columns/SituationColumn'
import { PhaseNav } from './PhaseNav'
import { PresenceAvatars } from './PresenceAvatars'

export function BoardView() {
  const room = useRoom()
  const title = useBoardTitle()
  const phase = useBoardPhase()
  const lifecycle = useBoardLifecycle()
  const options = useBoardOptions()
  const decision = useBoardDecision()
  const setPhase = useSetPhase()
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

  const columns: Record<Phase, ReactNode> = {
    situation: <SituationColumn disabled={signed} />,
    ideation: <OptionsColumn options={options} disabled={signed} />,
    evaluation: <EvaluationColumn options={options} disabled={signed} />,
    scoring: <ScoringColumn options={options} disabled={signed} />,
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
    <Container size="xl" py="md">
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="wrap">
          <TextInput
            variant="unstyled"
            value={title}
            disabled={signed}
            onChange={(event) => setTitle(event.currentTarget.value)}
            styles={{ input: { fontSize: 'var(--mantine-font-size-xl)', fontWeight: 700 } }}
            aria-label="Board title"
          />
          <Group gap="sm">
            {signed && <Badge color="gray">Signed</Badge>}
            {signed && import.meta.env.DEV && (
              <Tooltip label="Dev-only: reverts sign-off so this room can be reused for testing">
                <Button size="xs" variant="subtle" color="red" onClick={() => unsignBoard()}>
                  Unlock (dev)
                </Button>
              </Tooltip>
            )}
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

        <Group justify="space-between" align="center" wrap="wrap">
          {!signed ? (
            <PhaseNav currentPhase={phase} onChange={setPhase} />
          ) : (
            <Text c="dimmed" size="sm">
              This board is signed and read-only. Clone it to make further changes.
            </Text>
          )}
          <Group gap="xs">
            <Tooltip label="Not implemented in this scaffold">
              <Button variant="default" disabled>
                Export PNG
              </Button>
            </Tooltip>
            <Tooltip label="Not implemented in this scaffold">
              <Button variant="default" disabled={!signed}>
                Clone
              </Button>
            </Tooltip>
          </Group>
        </Group>

        <BoardLayout currentPhase={phase} onFocusPhase={setPhase} columns={columns} />
      </Stack>
    </Container>
  )
}
