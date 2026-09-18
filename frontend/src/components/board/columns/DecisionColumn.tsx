import { Badge, Button, Card, Divider, Group, Stack, Text, TextInput, Title } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import { IconCheck, IconLock } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import {
  useSetApprovedBy,
  useSetChosenOption,
  useSetDeadline,
  useSetNextStep,
  useSetOwner,
  useSignBoard,
} from '../../../hooks/useBoardMutations'
import { useRatingProperties } from '../../../hooks/useBoardState'
import { useFragmentPlainTexts } from '../../../liveblocks-yjs/useFragmentPlainText'
import type { DecisionData, OptionData } from '../../../types/board'
import {
  COUNTERMEASURE_FIELD,
  DISSENT_FIELD,
  optionTextField,
  totalScore,
} from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { LiveClock } from '../LiveClock'
import { SignBoardModal } from '../SignBoardModal'

interface DecisionColumnProps {
  options: readonly OptionData[]
  decision: DecisionData
  signed: boolean
  signedAt: string | null
  disabled?: boolean
}

function LeaderboardRow({
  rank,
  title,
  points,
  chosen,
  disabled,
  onSelect,
}: {
  rank: number
  title: string
  points: number | null
  chosen: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <Card
      withBorder
      padding={6}
      radius="sm"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={chosen}
      aria-label={`Select ${title}`}
      onClick={disabled ? undefined : onSelect}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      style={{
        cursor: disabled ? 'default' : 'pointer',
        borderColor: chosen ? 'var(--mantine-color-green-6)' : undefined,
        borderWidth: chosen ? 2 : 1,
        background: chosen ? 'var(--mantine-color-green-0)' : undefined,
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" fw={700} c="dimmed" style={{ flexShrink: 0 }}>
            {rank}.
          </Text>
          <Text size="sm" fw={chosen ? 700 : 500} truncate>
            {title}
          </Text>
        </Group>
        <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text size="xs" fw={700} c="dimmed">
            {points ?? '–'} pts
          </Text>
          {chosen && (
            <Badge color="green" variant="filled" leftSection={<IconCheck size={12} />}>
              Selected
            </Badge>
          )}
        </Group>
      </Group>
    </Card>
  )
}

/** Records the chosen option, its countermeasure, any dissent, and drives the (irreversible in
 * MVP) sign-off action. See `docs/mvp-scope.md`: there is no "unsign" — Clone is the intended
 * flow for further changes after sign-off.
 *
 * Picking the option is a ranked leaderboard, highest score first — clicking a row toggles it as
 * the chosen option (clicking the chosen row again clears it) — rather than a dropdown, since
 * comparing options by score is the point of this step. It deliberately doesn't repeat each
 * option's Good/Bad or ratings detail: that's already visible alongside it in the Evaluation
 * column, which stays expanded as a read-only reference once this phase is selected (see
 * `columnLayout.ts` and `EvaluationColumn`'s `reference` prop) instead of being duplicated here. */
export function DecisionColumn({
  options,
  decision,
  signed,
  signedAt,
  disabled,
}: DecisionColumnProps) {
  const setChosenOption = useSetChosenOption()
  const setApprovedBy = useSetApprovedBy()
  const setNextStep = useSetNextStep()
  const setOwner = useSetOwner()
  const setDeadline = useSetDeadline()
  const signBoard = useSignBoard()
  const properties = useRatingProperties()
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)

  const optionTextFields = useMemo(
    () => options.map((option) => optionTextField(option.id)),
    [options],
  )
  const optionTexts = useFragmentPlainTexts(optionTextFields)
  const titleById = useMemo(
    () =>
      new Map(options.map((option, index) => [option.id, optionTexts[index] || 'Untitled option'])),
    [options, optionTexts],
  )

  const rankedOptions = useMemo(
    () =>
      [...options].sort(
        (a, b) =>
          (totalScore(b.scores, properties) ?? -Infinity) -
          (totalScore(a.scores, properties) ?? -Infinity),
      ),
    [options, properties],
  )

  const canSign =
    !signed &&
    Boolean(decision.chosenOptionId) &&
    Boolean(decision.approvedBy?.trim()) &&
    Boolean(decision.nextStep?.trim()) &&
    Boolean(decision.owner?.trim()) &&
    Boolean(decision.deadline)

  return (
    <>
      <Stack gap="xs">
        <Title order={3} size="h5">
          Ranking leaderboard
        </Title>
        {options.length === 0 ? (
          <Text size="sm" c="dimmed">
            Add some options first, or jump in anyway.
          </Text>
        ) : (
          <Stack gap={4} data-testid="decision-leaderboard">
            {rankedOptions.map((option, index) => (
              <LeaderboardRow
                key={option.id}
                rank={index + 1}
                title={titleById.get(option.id) ?? 'Untitled option'}
                points={totalScore(option.scores, properties)}
                chosen={decision.chosenOptionId === option.id}
                disabled={disabled}
                onSelect={() =>
                  setChosenOption(decision.chosenOptionId === option.id ? null : option.id)
                }
              />
            ))}
          </Stack>
        )}
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Title order={3} size="h5">
          Decision
        </Title>

        <CollaborativeTextField
          field={COUNTERMEASURE_FIELD}
          label="Countermeasure plan"
          placeholder="Notes on how to overcome the chosen option's blocker…"
          disabled={disabled}
        />

        <Stack gap={4}>
          <Text size="xs" fw={700} c="red.7">
            DISSENT / MINORITY OPINION
          </Text>
          <CollaborativeTextField
            field={DISSENT_FIELD}
            placeholder="Note any objections, even after a decision has been drafted…"
            disabled={disabled}
          />
        </Stack>

        <Stack gap={4}>
          <TextInput
            label="Approved by"
            placeholder="Name of the approver"
            value={decision.approvedBy ?? ''}
            disabled={disabled}
            onChange={(event) => setApprovedBy(event.currentTarget.value)}
          />
          <Group gap={4} align="baseline">
            <Text size="sm" c="dimmed">
              on
            </Text>
            {signed && signedAt ? (
              <Text size="sm">{dayjs(signedAt).format('D MMM YYYY')}</Text>
            ) : (
              <LiveClock />
            )}
          </Group>
        </Stack>
      </Stack>

      <Divider />

      <Stack gap="xs">
        <Title order={3} size="h5">
          Next steps
        </Title>
        <Text size="xs" c="dimmed">
          This doesn't need to describe who owns everything going forward — just the immediate next
          step (e.g. "write an RFC" or "organise a further design session"). It must have an owner
          and a deadline attached before signing.
        </Text>
        <TextInput
          placeholder="e.g. Write an RFC"
          value={decision.nextStep ?? ''}
          disabled={disabled}
          onChange={(event) => setNextStep(event.currentTarget.value)}
        />
        <Group grow>
          <TextInput
            label="Owner"
            placeholder="Who's driving this"
            value={decision.owner ?? ''}
            disabled={disabled}
            onChange={(event) => setOwner(event.currentTarget.value)}
          />
          <DateInput
            label="Deadline"
            placeholder="Pick a date"
            value={decision.deadline ? new Date(decision.deadline) : null}
            disabled={disabled}
            onChange={(value) => setDeadline(value)}
            valueFormat="D MMM YYYY"
          />
        </Group>
      </Stack>

      {signed ? (
        <Badge color="gray" variant="light">
          Signed — board is read-only
        </Badge>
      ) : (
        <Button
          onClick={openModal}
          disabled={!canSign}
          color="red"
          fullWidth
          leftSection={<IconLock size={16} />}
        >
          Sign Decision
        </Button>
      )}

      <SignBoardModal
        opened={modalOpened}
        onClose={closeModal}
        onConfirm={() => {
          signBoard()
          closeModal()
        }}
      />
    </>
  )
}
