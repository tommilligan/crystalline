import { Badge, Card, Divider, Group, NumberInput, Stack, Text } from '@mantine/core'
import { IconChartBar } from '@tabler/icons-react'
import { useSetScore } from '../../../hooks/useBoardMutations'
import { useFragmentPlainText } from '../../../liveblocks-yjs/useFragmentPlainText'
import type { OptionData, ScoreDimension } from '../../../types/board'
import { optionTextField, SCORE_DIMENSIONS, totalScore } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { EmptyColumnState } from '../EmptyColumnState'
import { ScoreLegend } from '../ScoreLegend'

interface ScoringColumnProps {
  options: readonly OptionData[]
  disabled?: boolean
}

const COST_DIMENSIONS = SCORE_DIMENSIONS.slice(0, 3)
const BENEFIT_DIMENSIONS = SCORE_DIMENSIONS.slice(3)
const MAX_TOTAL = SCORE_DIMENSIONS.length * 5

function abbreviate(label: string): string {
  return label.slice(0, 2)
}

function DimensionRow({
  groupLabel,
  dimensions,
  option,
  disabled,
  setScore,
}: {
  groupLabel: string
  dimensions: readonly (typeof SCORE_DIMENSIONS)[number][]
  option: OptionData
  disabled?: boolean
  setScore: ReturnType<typeof useSetScore>
}) {
  return (
    <div>
      <Text size="xs" c="dimmed" fw={600} mb={4}>
        {groupLabel.toUpperCase()} (
        {dimensions.map((dimension) => abbreviate(dimension.label)).join('/')})
      </Text>
      <Group gap={6}>
        {dimensions.map((dimension) => (
          <NumberInput
            key={dimension.key}
            aria-label={dimension.label}
            title={dimension.label}
            value={option.scores?.[dimension.key] ?? undefined}
            placeholder="–"
            min={1}
            max={5}
            hideControls
            disabled={disabled}
            w={52}
            onChange={(value) => {
              if (typeof value === 'number') {
                setScore(option.id, dimension.key as ScoreDimension, value)
              }
            }}
          />
        ))}
      </Group>
    </div>
  )
}

function RankingLeaderboard({ options }: { options: readonly OptionData[] }) {
  const ranked = [...options]
    .filter((option) => option.scores !== null)
    .sort((a, b) => (totalScore(b.scores) ?? 0) - (totalScore(a.scores) ?? 0))

  if (ranked.length === 0) return null

  return (
    <Card withBorder padding="sm" radius="sm">
      <Text size="xs" fw={700} c="dimmed" mb="xs">
        RANKING LEADERBOARD
      </Text>
      <Stack gap={4}>
        {ranked.map((option, index) => (
          <LeaderboardRow key={option.id} option={option} rank={index + 1} isTop={index === 0} />
        ))}
      </Stack>
    </Card>
  )
}

function LeaderboardRow({
  option,
  rank,
  isTop,
}: {
  option: OptionData
  rank: number
  isTop: boolean
}) {
  const text = useFragmentPlainText(optionTextField(option.id))
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      p={6}
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        background: isTop ? 'var(--mantine-color-green-0)' : undefined,
      }}
    >
      <Text size="xs" fw={isTop ? 700 : 500} c={isTop ? 'green.8' : undefined} truncate>
        {rank}. {text || 'Untitled option'}
      </Text>
      <Text size="xs" fw={700} c={isTop ? 'green.8' : 'dimmed'}>
        {totalScore(option.scores)} pts
      </Text>
    </Group>
  )
}

/** Six-dimension scoring, always shown with the 1=bad/5=good legend pinned above the inputs —
 * an inverted, unexplained cost scale was the single biggest point of confusion in the original
 * whiteboard tool (see `docs/concept.md`). */
export function ScoringColumn({ options, disabled }: ScoringColumnProps) {
  const setScore = useSetScore()

  if (options.length === 0) {
    return (
      <EmptyColumnState
        icon={IconChartBar}
        title="No Numerical Trade-offs Yet"
        description="Add some options in the Options column first, or jump in anyway."
        placeholder="Placeholder scoring card"
      />
    )
  }

  return (
    <>
      <ScoreLegend />
      {options.map((option) => {
        const total = totalScore(option.scores)
        return (
          <Card key={option.id} withBorder padding="sm" radius="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <div style={{ flex: 1, minWidth: 0 }}>
                <CollaborativeTextField field={optionTextField(option.id)} disabled />
              </div>
              {total !== null && (
                <Badge color="blue" variant="light" style={{ flexShrink: 0 }}>
                  {total}/{MAX_TOTAL}
                </Badge>
              )}
            </Group>
            <Divider my="xs" />
            <Stack gap="xs">
              <DimensionRow
                groupLabel="Costs"
                dimensions={COST_DIMENSIONS}
                option={option}
                disabled={disabled}
                setScore={setScore}
              />
              <DimensionRow
                groupLabel="Benefits"
                dimensions={BENEFIT_DIMENSIONS}
                option={option}
                disabled={disabled}
                setScore={setScore}
              />
            </Stack>
          </Card>
        )
      })}
      <RankingLeaderboard options={options} />
    </>
  )
}
