import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import { IconLock, IconPlus, IconX } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { type MouseEvent, type ReactNode, useMemo, useRef, useState } from 'react'
import {
  useAddNextStep,
  useCommitNextSteps,
  useRemoveNextStep,
  useSetAgreement,
  useSetApprovedBy,
  useSetChosenOption,
  useSignBoard,
  useUpdateNextStep,
} from '../../../hooks/useBoardMutations'
import { useRatingProperties } from '../../../hooks/useBoardState'
import { fireConfettiFromPoint } from '../../../lib/confetti'
import { useFragmentPlainTexts } from '../../../liveblocks-yjs/useFragmentPlainText'
import type { Agreement, DecisionData, NextStepData, OptionData } from '../../../types/board'
import {
  AGREEMENT_OPTIONS,
  COUNTERMEASURE_FIELD,
  DISSENT_FIELD,
  optionDisplayId,
  optionTextField,
  totalScore,
} from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { LiveClock } from '../LiveClock'
import { SignBoardModal } from '../SignBoardModal'

interface DecisionColumnProps {
  options: readonly OptionData[]
  decision: DecisionData
  nextSteps: readonly NextStepData[]
  nextStepsCommitted: boolean
  signed: boolean
  signedAt: string | null
  disabled?: boolean
}

function LeaderboardRow({
  rank,
  displayId,
  title,
  points,
  chosen,
  disabled,
  onSelect,
}: {
  rank: number
  displayId: string
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
      aria-label={`Select ${displayId}: ${title}`}
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
            {displayId}: {title}
          </Text>
        </Group>
        <Text size="xs" fw={700} c="dimmed" style={{ flexShrink: 0 }}>
          {points ?? '–'} pts
        </Text>
      </Group>
    </Card>
  )
}

/** Visually sets an input row apart from the surrounding prose sentences, echoing the indented
 * `>` blockquote convention used to spec this layout — a plain left border reads as "this is the
 * fillable part" without competing with the sentence text around it. */
function ProseInput({ children }: { children: ReactNode }) {
  return (
    <Box pl="sm" py={2} style={{ borderLeft: '3px solid var(--mantine-color-gray-4)' }}>
      {children}
    </Box>
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
 * `columnLayout.ts` and `EvaluationColumn`'s `reference` prop) instead of being duplicated here.
 *
 * The decision itself reads as a single piece of prose (chosen option, countermeasure, how it was
 * agreed, optional dissent, formal approval) rather than a form of separately-labelled fields, so
 * signing feels like completing a sentence rather than filling in a form. Signing then hands off
 * to the Next Steps table below — deliberately *not* locked by the board's `signed`/`disabled`
 * state, since filling in the plan is the thing signing is meant to prompt, not something signing
 * should block. */
export function DecisionColumn({
  options,
  decision,
  nextSteps,
  nextStepsCommitted,
  signed,
  signedAt,
  disabled,
}: DecisionColumnProps) {
  const setChosenOption = useSetChosenOption()
  const setApprovedBy = useSetApprovedBy()
  const setAgreement = useSetAgreement()
  const signBoard = useSignBoard()
  const addNextStep = useAddNextStep()
  const updateNextStep = useUpdateNextStep()
  const removeNextStep = useRemoveNextStep()
  const commitNextSteps = useCommitNextSteps()
  const properties = useRatingProperties()
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [newStepDraft, setNewStepDraft] = useState('')
  const nextStepsSectionRef = useRef<HTMLDivElement>(null)
  const addStepInputRef = useRef<HTMLInputElement>(null)

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
  // Assigned from the canonical (creation-order) `options` list, not any sorted/ranked view of
  // it, so an option keeps the same letter everywhere it's shown — see `optionDisplayId`.
  const displayIdById = useMemo(
    () => new Map(options.map((option, index) => [option.id, optionDisplayId(index)])),
    [options],
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

  const chosenTitle = decision.chosenOptionId
    ? (titleById.get(decision.chosenOptionId) ?? null)
    : null
  const chosenDisplayId = decision.chosenOptionId
    ? (displayIdById.get(decision.chosenOptionId) ?? null)
    : null

  const showDissent = decision.agreement !== null && decision.agreement !== 'all'

  const canSign =
    !signed &&
    Boolean(decision.chosenOptionId) &&
    Boolean(decision.approvedBy?.trim()) &&
    Boolean(decision.agreement)

  const canCommitNextSteps = !nextStepsCommitted && nextSteps.some((step) => step.action.trim())

  function handleSign(event: MouseEvent<HTMLButtonElement>) {
    fireConfettiFromPoint(event.clientX, event.clientY)
    signBoard()
    closeModal()
    // Give the modal a moment to close and the layout to settle before moving focus, rather than
    // fighting its own closing transition.
    setTimeout(() => {
      nextStepsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      addStepInputRef.current?.focus()
    }, 50)
  }

  function handleAddNextStep() {
    const action = newStepDraft.trim()
    if (!action || nextStepsCommitted) return
    addNextStep(action)
    setNewStepDraft('')
  }

  return (
    <>
      <Stack gap="xs">
        <Title order={3} size="h5">
          Option ranking after evaluation
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
                displayId={displayIdById.get(option.id) ?? '?'}
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

        <Text size="sm">
          We have decided on option{' '}
          {chosenDisplayId && chosenTitle ? (
            <Text span fw={700}>
              {chosenDisplayId}: {chosenTitle}
            </Text>
          ) : (
            <Text span c="dimmed">
              — not yet chosen, select one from the ranking above
            </Text>
          )}
          .
        </Text>

        <Text size="sm">To mitigate the downsides of this option, we will:</Text>
        <ProseInput>
          <CollaborativeTextField
            field={COUNTERMEASURE_FIELD}
            placeholder="Notes on how to overcome the chosen option's blocker…"
            disabled={disabled}
          />
        </ProseInput>

        <Group gap={6} wrap="wrap" align="center">
          <Text size="sm">This decision was agreed to</Text>
          <Select
            data={AGREEMENT_OPTIONS}
            value={decision.agreement}
            onChange={(value) => setAgreement((value as Agreement | null) ?? null)}
            placeholder="select…"
            disabled={disabled}
            allowDeselect={false}
            size="xs"
            w={150}
          />
          <Text size="sm">.</Text>
        </Group>

        {showDissent && (
          <>
            <Text size="xs" fw={700} c="red.7">
              For the record, the dissenting opinion states:
            </Text>
            <ProseInput>
              <CollaborativeTextField
                field={DISSENT_FIELD}
                placeholder="Note any objections, even after a decision has been drafted…"
                disabled={disabled}
              />
            </ProseInput>
          </>
        )}

        <Group gap={4} wrap="wrap" align="baseline">
          <Text size="sm">This decision has been formally approved on</Text>
          {signed && signedAt ? (
            <Text size="sm" fw={600}>
              {dayjs(signedAt).format('D MMM YYYY')}
            </Text>
          ) : (
            <LiveClock />
          )}
          <Text size="sm">by:</Text>
        </Group>
        <ProseInput>
          <TextInput
            placeholder="Name of the approver"
            value={decision.approvedBy ?? ''}
            disabled={disabled}
            onChange={(event) => setApprovedBy(event.currentTarget.value)}
          />
        </ProseInput>

        {signed ? (
          <Badge color="gray" variant="light" style={{ alignSelf: 'flex-start' }}>
            Signed — decision is read-only
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
      </Stack>

      <Divider />

      <Stack gap="xs" ref={nextStepsSectionRef}>
        <Title order={3} size="h5">
          Next steps
        </Title>
        <Text size="xs" c="dimmed">
          The concrete actions that turn this decision into progress — each needs an owner and,
          ideally, a due date. Add as many as the plan needs, then commit to lock them in.
        </Text>

        {nextSteps.length > 0 && (
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Action</Table.Th>
                <Table.Th>Owner</Table.Th>
                <Table.Th>Due date</Table.Th>
                {!nextStepsCommitted && <Table.Th w={32} />}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {nextSteps.map((step) => (
                <Table.Tr key={step.id}>
                  <Table.Td>
                    <TextInput
                      placeholder="e.g. Write an RFC"
                      value={step.action}
                      disabled={nextStepsCommitted}
                      onChange={(event) =>
                        updateNextStep(step.id, { action: event.currentTarget.value })
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      placeholder="Who's driving this"
                      value={step.owner}
                      disabled={nextStepsCommitted}
                      onChange={(event) =>
                        updateNextStep(step.id, { owner: event.currentTarget.value })
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <DateInput
                      placeholder="Pick a date"
                      value={step.dueDate}
                      disabled={nextStepsCommitted}
                      onChange={(value) => updateNextStep(step.id, { dueDate: value })}
                      valueFormat="D MMM YYYY"
                    />
                  </Table.Td>
                  {!nextStepsCommitted && (
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label="Remove step"
                        onClick={() => removeNextStep(step.id)}
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        {!nextStepsCommitted && (
          <TextInput
            ref={addStepInputRef}
            rightSection={<IconPlus size={16} />}
            placeholder="Type a next step, press Enter"
            value={newStepDraft}
            onChange={(event) => setNewStepDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleAddNextStep()
              }
            }}
          />
        )}

        {nextStepsCommitted ? (
          <Badge color="gray" variant="light" style={{ alignSelf: 'flex-start' }}>
            Committed — plan is read-only
          </Badge>
        ) : (
          <Button
            onClick={() => commitNextSteps()}
            disabled={!canCommitNextSteps}
            variant="light"
            color="teal"
            fullWidth
            leftSection={<IconLock size={16} />}
          >
            Commit to Action
          </Button>
        )}
      </Stack>

      <SignBoardModal opened={modalOpened} onClose={closeModal} onConfirm={handleSign} />
    </>
  )
}
