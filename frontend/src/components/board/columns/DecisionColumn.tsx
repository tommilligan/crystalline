import {
  Accordion,
  Badge,
  Button,
  Divider,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import { IconLock } from '@tabler/icons-react'
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
import { EvaluationSummary, ScoringSummary } from './OptionSummaries'

interface DecisionColumnProps {
  options: readonly OptionData[]
  decision: DecisionData
  signed: boolean
  signedAt: string | null
  disabled?: boolean
}

function SummaryAccordionControl({ title, points }: { title: string; points: number }) {
  return (
    <Group justify="space-between" align="center" wrap="nowrap" gap="xs" style={{ flex: 1 }}>
      <Title
        order={4}
        size="sm"
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </Title>
      {/* A plain number, not a `Badge` — Mantine's Badge is uppercase by default, which would
       * shout "POINTS" rather than read as a simple total. */}
      <Text size="sm" fw={600} c="dimmed" mr={4} style={{ flexShrink: 0 }}>
        {points} points
      </Text>
    </Group>
  )
}

/** Records the chosen option, its countermeasure, any dissent, and drives the (irreversible in
 * MVP) sign-off action. See `docs/mvp-scope.md`: there is no "unsign" — Clone is the intended
 * flow for further changes after sign-off.
 *
 * Unlike Evaluation/Scoring's one-option-at-a-time walkthrough, every option's summary is open
 * at once here (an Accordion in `multiple` mode, all expanded by default) since deciding means
 * comparing every option side by side rather than focusing on one — each summary inlines a
 * read-only copy of that option's Evaluation (Good/Bad) and Scoring (cost/benefit) fields, the
 * same information `columnLayout.ts` collapses out of columns 3-4 once this column is reached,
 * ordered by total score (highest first) rather than entry order. Because titles are no longer
 * unique per position on screen once they're reorderable, choosing the decision is a dropdown
 * (keyed by option id, not array index) rather than clicking a card. */
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
        (a, b) => (totalScore(b.scores) ?? -Infinity) - (totalScore(a.scores) ?? -Infinity),
      ),
    [options],
  )

  const selectData = useMemo(
    () =>
      options.map((option) => ({
        value: option.id,
        label: titleById.get(option.id) ?? 'Untitled option',
      })),
    [options, titleById],
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
          Summary of options
        </Title>
        {options.length === 0 ? (
          <Text size="sm" c="dimmed">
            Add some options first, or jump in anyway.
          </Text>
        ) : (
          <Accordion
            multiple
            defaultValue={rankedOptions.map((option) => option.id)}
            variant="separated"
          >
            {rankedOptions.map((option) => (
              <Accordion.Item key={option.id} value={option.id}>
                <Accordion.Control>
                  <SummaryAccordionControl
                    title={titleById.get(option.id) ?? 'Untitled option'}
                    points={totalScore(option.scores) ?? 0}
                  />
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <EvaluationSummary option={option} />
                    <ScoringSummary option={option} />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      </Stack>

      <Divider />

      <Stack gap="sm">
        <Title order={3} size="h5">
          Decision
        </Title>

        <Select
          label="Chosen option"
          placeholder="Select an option"
          data={selectData}
          value={decision.chosenOptionId}
          onChange={(value) => setChosenOption(value)}
          disabled={disabled || options.length === 0}
          clearable
        />

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
