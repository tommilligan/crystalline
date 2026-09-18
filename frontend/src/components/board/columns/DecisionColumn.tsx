import {
  ActionIcon,
  Blockquote,
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
import { IconLock, IconX } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  useAddNextStep,
  useCommitNextSteps,
  useEnsureFirstNextStep,
  useRemoveNextStep,
  useSetAgreement,
  useSetApprovedBy,
  useSetChosenOption,
  useSignBoard,
  useUpdateNextStep,
} from '../../../hooks/useBoardMutations'
import { useRatingProperties } from '../../../hooks/useBoardState'
import { fireConfettiFromPoint } from '../../../lib/confetti'
import {
  useFragmentPlainText,
  useFragmentPlainTexts,
} from '../../../liveblocks-yjs/useFragmentPlainText'
import type { Agreement, DecisionData, NextStepData, OptionData } from '../../../types/board'
import {
  AGREEMENT_OPTIONS,
  COUNTERMEASURE_FIELD,
  DISSENT_FIELD,
  nextStepHasContent,
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
  displayId,
  title,
  points,
  chosen,
  disabled,
  onSelect,
}: {
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
        <Text size="sm" fw={chosen ? 700 : 500} truncate style={{ flex: 1, minWidth: 0 }}>
          {displayId}: {title}
        </Text>
        <Text size="xs" fw={700} c="dimmed" style={{ flexShrink: 0 }}>
          {points ?? '–'} pts
        </Text>
      </Group>
    </Card>
  )
}

/** A Yjs-backed decision field: editable while the board isn't signed, otherwise a plain prose
 * readout — the same signed/unsigned split as `GoodBadSummary`/`GoodBadFields` in
 * `OptionSummaries.tsx`, just inline here since the countermeasure and dissent fields are the
 * only two decision fields shaped this way (plain free text, no other structure to represent). */
function DecisionTextField({
  field,
  placeholder,
  text,
  signed,
  disabled,
}: {
  field: string
  placeholder: string
  text: string
  signed: boolean
  disabled?: boolean
}) {
  if (signed) {
    return (
      <Blockquote color="gray" p="sm">
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} c={text ? undefined : 'dimmed'}>
          {text || 'None recorded'}
        </Text>
      </Blockquote>
    )
  }
  return <CollaborativeTextField field={field} placeholder={placeholder} disabled={disabled} />
}

/** Records the chosen option, its countermeasure, any dissent, and drives the (irreversible in
 * MVP) sign-off action. See `docs/mvp-scope.md`: there is no "unsign" — Clone is the intended
 * flow for further changes after sign-off.
 *
 * Picking the option is a ranked leaderboard, highest score first — clicking a row toggles it as
 * the chosen option (clicking the chosen row again clears it) — rather than a dropdown, since
 * comparing options by score is the point of this step. It deliberately doesn't repeat each
 * option's Pros/Cons or ratings detail: that's already visible alongside it in the Evaluation
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
  const ensureFirstNextStep = useEnsureFirstNextStep()
  const updateNextStep = useUpdateNextStep()
  const removeNextStep = useRemoveNextStep()
  const commitNextSteps = useCommitNextSteps()
  const properties = useRatingProperties()
  const countermeasureText = useFragmentPlainText(COUNTERMEASURE_FIELD)
  const dissentText = useFragmentPlainText(DISSENT_FIELD)
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)
  const [signAttempted, setSignAttempted] = useState(false)
  const nextStepsSectionRef = useRef<HTMLDivElement>(null)
  const firstActionInputRef = useRef<HTMLInputElement>(null)

  // Keeps at least one (possibly blank) row always present while the plan isn't committed yet,
  // so the table's header and a row of placeholders are always visible — there's no separate
  // "type to add the first one" input distinct from the table itself.
  useEffect(() => {
    if (nextSteps.length === 0 && !nextStepsCommitted) {
      ensureFirstNextStep()
    }
  }, [nextSteps.length, nextStepsCommitted, ensureFirstNextStep])

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

  const chosenValid = Boolean(decision.chosenOptionId)
  const approvedByValid = Boolean(decision.approvedBy?.trim())
  const agreementValid = Boolean(decision.agreement)
  const canSign = !signed && chosenValid && approvedByValid && agreementValid

  const canCommitNextSteps = !nextStepsCommitted && nextSteps.some((step) => step.action.trim())

  // Rather than just disabling "Sign Decision" until every field is filled, clicking it while
  // incomplete highlights whichever fields are still missing (in red) and stays put — the
  // classic "clicked submit on an incomplete form" pattern — instead of silently doing nothing.
  function handleSignClick() {
    setSignAttempted(true)
    if (canSign) openModal()
  }

  function handleSign(event: MouseEvent<HTMLButtonElement>) {
    fireConfettiFromPoint(event.clientX, event.clientY)
    signBoard()
    closeModal()
    // Give the modal a moment to close and the layout to settle before moving focus, rather than
    // fighting its own closing transition.
    setTimeout(() => {
      nextStepsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      firstActionInputRef.current?.focus()
    }, 50)
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
            {rankedOptions.map((option) => (
              <LeaderboardRow
                key={option.id}
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
            <Text span c={signAttempted && !chosenValid ? 'red' : 'dimmed'}>
              — not yet chosen, select one from the ranking above
            </Text>
          )}
          .
        </Text>

        <Text size="sm">To mitigate the downsides of this option, we will:</Text>
        <DecisionTextField
          field={COUNTERMEASURE_FIELD}
          placeholder="Mitigation plan"
          text={countermeasureText}
          signed={signed}
          disabled={disabled}
        />

        {signed ? (
          <Text size="sm">
            This decision was agreed to{' '}
            <Text span fw={700}>
              {AGREEMENT_OPTIONS.find((option) => option.value === decision.agreement)?.label ??
                decision.agreement}
            </Text>
            .
          </Text>
        ) : (
          <Group gap={6} wrap="wrap" align="center">
            <Text size="sm">This decision was agreed to</Text>
            <Select
              data={AGREEMENT_OPTIONS}
              value={decision.agreement}
              onChange={(value) => setAgreement((value as Agreement | null) ?? null)}
              placeholder="select…"
              disabled={disabled}
              allowDeselect={false}
              error={signAttempted && !agreementValid}
              size="xs"
              w={150}
            />
            <Text size="sm">.</Text>
          </Group>
        )}

        {showDissent && (
          <>
            <Text size="sm">For the record, the dissenting opinion states:</Text>
            <DecisionTextField
              field={DISSENT_FIELD}
              placeholder="We feel that…"
              text={dissentText}
              signed={signed}
              disabled={disabled}
            />
          </>
        )}

        {signed && signedAt ? (
          <Text size="sm">
            This decision has been formally approved on{' '}
            <Text span fw={600}>
              {dayjs(signedAt).format('D MMM YYYY')}
            </Text>{' '}
            by{' '}
            <Text span fw={700}>
              {decision.approvedBy || '—'}
            </Text>
            .
          </Text>
        ) : (
          <>
            <Group gap={4} wrap="wrap" align="baseline">
              <Text size="sm">This decision has been formally approved on</Text>
              <LiveClock />
              <Text size="sm">by:</Text>
            </Group>
            <TextInput
              placeholder="Name of the approver"
              value={decision.approvedBy ?? ''}
              disabled={disabled}
              error={signAttempted && !approvedByValid}
              onChange={(event) => setApprovedBy(event.currentTarget.value)}
            />
          </>
        )}

        {signed ? (
          <Button
            color="dark"
            variant="outline"
            fullWidth
            aria-disabled="true"
            tabIndex={-1}
            style={{ cursor: 'default', pointerEvents: 'none' }}
          >
            Decision Signed ✅
          </Button>
        ) : (
          <Button
            onClick={handleSignClick}
            disabled={disabled}
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
            {nextStepsCommitted
              ? nextSteps.filter(nextStepHasContent).map((step) => (
                  <Table.Tr key={step.id}>
                    <Table.Td>{step.action || '—'}</Table.Td>
                    <Table.Td>{step.owner || '—'}</Table.Td>
                    <Table.Td>
                      {step.dueDate ? dayjs(step.dueDate).format('D MMM YYYY') : '—'}
                    </Table.Td>
                  </Table.Tr>
                ))
              : nextSteps.map((step, index) => (
                  <Table.Tr key={step.id}>
                    <Table.Td>
                      <TextInput
                        ref={index === 0 ? firstActionInputRef : undefined}
                        placeholder="e.g. Write an RFC"
                        value={step.action}
                        onChange={(event) =>
                          updateNextStep(step.id, { action: event.currentTarget.value })
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        placeholder="Who's driving this"
                        value={step.owner}
                        onChange={(event) =>
                          updateNextStep(step.id, { owner: event.currentTarget.value })
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <DateInput
                        placeholder="Pick a date"
                        value={step.dueDate}
                        onChange={(value) => updateNextStep(step.id, { dueDate: value })}
                        valueFormat="D MMM YYYY"
                      />
                    </Table.Td>
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
                  </Table.Tr>
                ))}
          </Table.Tbody>
        </Table>

        {!nextStepsCommitted && (
          <Button
            variant="subtle"
            size="xs"
            onClick={() => addNextStep('')}
            style={{ alignSelf: 'flex-start' }}
          >
            Add action +
          </Button>
        )}

        {nextStepsCommitted ? (
          <Button
            color="dark"
            variant="outline"
            fullWidth
            aria-disabled="true"
            tabIndex={-1}
            style={{ cursor: 'default', pointerEvents: 'none' }}
          >
            Actions committed ✅
          </Button>
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
