import { Badge, Divider, Group, Stack, Text, Title } from '@mantine/core'
import dayjs from 'dayjs'
import type { DecisionData, OptionData, RatingProperty } from '../../types/board'
import { totalScore } from '../../types/board'
import { EvaluationSummaryBody } from '../board/columns/OptionSummaries'

interface DecisionSummarySectionProps {
  /** Ranked highest-score-first, same order as `DecisionColumn`'s leaderboard. */
  options: readonly OptionData[]
  properties: readonly RatingProperty[]
  titleById: ReadonlyMap<string, string>
  decision: DecisionData
  chosenTitle: string | null
  countermeasureText: string
  dissentText: string
  signed: boolean
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
  decision,
  chosenTitle,
  countermeasureText,
  dissentText,
  signed,
}: DecisionSummarySectionProps) {
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
                <Text fw={700}>{titleById.get(option.id) ?? 'Untitled option'}</Text>
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
        <Text fw={700} c="red.7">
          Dissent / minority opinion
        </Text>
        <Text style={{ whiteSpace: 'pre-wrap' }} c={dissentText ? undefined : 'dimmed'}>
          {dissentText || 'None recorded'}
        </Text>
      </Stack>

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

      <Stack gap={4}>
        <Text fw={700}>Next step</Text>
        <Text c={decision.nextStep ? undefined : 'dimmed'}>{decision.nextStep || '—'}</Text>
      </Stack>

      <Group grow align="flex-start">
        <Stack gap={2}>
          <Text fw={700}>Owner</Text>
          <Text c={decision.owner ? undefined : 'dimmed'}>{decision.owner || '—'}</Text>
        </Stack>
        <Stack gap={2}>
          <Text fw={700}>Deadline</Text>
          <Text c={decision.deadline ? undefined : 'dimmed'}>
            {decision.deadline ? dayjs(decision.deadline).format('D MMM YYYY') : '—'}
          </Text>
        </Stack>
      </Group>

      <Badge color={signed ? 'green' : 'gray'} variant="light" style={{ alignSelf: 'flex-start' }}>
        {signed ? 'Signed' : 'Not signed'}
      </Badge>
    </Stack>
  )
}
