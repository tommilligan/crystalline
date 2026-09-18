import { Badge, Divider, Group, Stack, Table, Text, Title } from '@mantine/core'
import dayjs from 'dayjs'
import type { DecisionData, NextStepData, OptionData, RatingProperty } from '../../types/board'
import { AGREEMENT_OPTIONS, totalScore } from '../../types/board'
import { EvaluationSummaryBody } from '../board/columns/OptionSummaries'

interface DecisionSummarySectionProps {
  /** Ranked highest-score-first, same order as `DecisionColumn`'s leaderboard. */
  options: readonly OptionData[]
  properties: readonly RatingProperty[]
  titleById: ReadonlyMap<string, string>
  displayIdById: ReadonlyMap<string, string>
  decision: DecisionData
  chosenTitle: string | null
  countermeasureText: string
  dissentText: string
  signed: boolean
  nextSteps: readonly NextStepData[]
  nextStepsCommitted: boolean
}

/** Section 4 of the export: every option's evaluation and ratings expanded (mirroring
 * `EvaluationColumn`'s read-only reference view, minus the accordion itself since a printed page
 * has no need to collapse anything), followed by the recorded decision fields. Reuses
 * `EvaluationSummaryBody` — the same plain read-only component `EvaluationColumn` renders once
 * Decision is selected — so the live reference view and this export stay visually and
 * behaviourally in sync by construction rather than by two hand-maintained copies. */
export function DecisionSummarySection({
  options,
  properties,
  titleById,
  displayIdById,
  decision,
  chosenTitle,
  countermeasureText,
  dissentText,
  signed,
  nextSteps,
  nextStepsCommitted,
}: DecisionSummarySectionProps) {
  const recordedNextSteps = nextSteps.filter(
    (step) => step.action.trim() || step.owner.trim() || step.dueDate,
  )

  return (
    <Stack gap="lg">
      <Title order={2}>4. Decision</Title>

      <Stack gap="md">
        {options.length === 0 ? (
          <Text c="dimmed">No options recorded.</Text>
        ) : (
          options.map((option, index) => (
            <Stack key={option.id} gap="xs">
              <Group justify="space-between" wrap="nowrap">
                <Text fw={700}>
                  {displayIdById.get(option.id) ?? '?'}:{' '}
                  {titleById.get(option.id) ?? 'Untitled option'}
                </Text>
                <Text fw={700} c="dimmed">
                  {totalScore(option.scores, properties) ?? 0} points
                </Text>
              </Group>
              <EvaluationSummaryBody option={option} properties={properties} />
              {index < options.length - 1 && <Divider mt="xs" />}
            </Stack>
          ))
        )}
      </Stack>

      <Divider />

      <Stack gap={4}>
        <Text fw={700}>Chosen option</Text>
        <Text c={chosenTitle ? undefined : 'dimmed'}>{chosenTitle ?? 'Not yet decided'}</Text>
      </Stack>

      <Stack gap={4}>
        <Text fw={700}>Countermeasure plan</Text>
        <Text style={{ whiteSpace: 'pre-wrap' }} c={countermeasureText ? undefined : 'dimmed'}>
          {countermeasureText || 'None recorded'}
        </Text>
      </Stack>

      <Stack gap={4}>
        <Text fw={700}>Agreement</Text>
        <Text c={decision.agreement ? undefined : 'dimmed'}>
          {decision.agreement
            ? `This decision was agreed to ${
                AGREEMENT_OPTIONS.find((option) => option.value === decision.agreement)?.label ??
                decision.agreement
              }.`
            : 'Not yet recorded'}
        </Text>
      </Stack>

      {decision.agreement && decision.agreement !== 'all' && (
        <Stack gap={4}>
          <Text fw={700}>Dissent / minority opinion</Text>
          <Text style={{ whiteSpace: 'pre-wrap' }} c={dissentText ? undefined : 'dimmed'}>
            {dissentText || 'None recorded'}
          </Text>
        </Stack>
      )}

      <Group grow align="flex-start">
        <Stack gap={2}>
          <Text fw={700}>Approved by</Text>
          <Text c={decision.approvedBy ? undefined : 'dimmed'}>{decision.approvedBy || '—'}</Text>
        </Stack>
        <Stack gap={2}>
          <Text fw={700}>Date</Text>
          <Text c={decision.date ? undefined : 'dimmed'}>
            {decision.date ? dayjs(decision.date).format('D MMM YYYY') : '—'}
          </Text>
        </Stack>
      </Group>

      <Badge color={signed ? 'green' : 'gray'} variant="light" style={{ alignSelf: 'flex-start' }}>
        {signed ? 'Signed' : 'Not signed'}
      </Badge>

      <Divider />

      <Stack gap={4}>
        <Group justify="space-between" align="center">
          <Text fw={700}>Next steps</Text>
          <Badge color={nextStepsCommitted ? 'teal' : 'gray'} variant="light">
            {nextStepsCommitted ? 'Committed' : 'Not yet committed'}
          </Badge>
        </Group>
        {/* Excludes the always-present blank row `DecisionColumn` keeps around for new entries
         * (see its doc comment) — an untouched row isn't a recorded next step. */}
        {recordedNextSteps.length === 0 ? (
          <Text c="dimmed">None recorded</Text>
        ) : (
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Action</Table.Th>
                <Table.Th>Owner</Table.Th>
                <Table.Th>Due date</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recordedNextSteps.map((step) => (
                <Table.Tr key={step.id}>
                  <Table.Td>{step.action || '—'}</Table.Td>
                  <Table.Td>{step.owner || '—'}</Table.Td>
                  <Table.Td>
                    {step.dueDate ? dayjs(step.dueDate).format('D MMM YYYY') : '—'}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Stack>
  )
}
