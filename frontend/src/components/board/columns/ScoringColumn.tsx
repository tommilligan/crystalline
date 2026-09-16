import { Accordion, ActionIcon, Badge, Card, Group, Stack, Text } from '@mantine/core'
import { IconChartBar } from '@tabler/icons-react'
import { useSetScore } from '../../../hooks/useBoardMutations'
import { useOptionWalkthrough } from '../../../hooks/useOptionWalkthrough'
import { useFragmentPlainText } from '../../../liveblocks-yjs/useFragmentPlainText'
import type { OptionData, ScoreDimension } from '../../../types/board'
import { optionTextField, SCORE_DIMENSIONS, totalScore } from '../../../types/board'
import { EmptyColumnState } from '../EmptyColumnState'
import { NextButton } from '../NextButton'
import { ScoreLegend } from '../ScoreLegend'

interface ScoringColumnProps {
  options: readonly OptionData[]
  disabled?: boolean
  active?: boolean
  onAdvancePhase?: () => void
}

const COST_DIMENSIONS = SCORE_DIMENSIONS.slice(0, 3)
const BENEFIT_DIMENSIONS = SCORE_DIMENSIONS.slice(3)
const MAX_TOTAL = SCORE_DIMENSIONS.length * 5
const SCORE_VALUES = [1, 2, 3, 4, 5] as const
const SCORE_BUTTON_SIZE = 20
// Buttons overlap by 1px of shared border (split-button join, see Mantine's SplitButton
// example), so the row is narrower than SCORE_VALUES.length * SCORE_BUTTON_SIZE.
const SCORE_BUTTONS_WIDTH = SCORE_BUTTON_SIZE + (SCORE_VALUES.length - 1) * (SCORE_BUTTON_SIZE - 1)

function ScoreButtons({
  value,
  dimensionLabel,
  disabled,
  onChange,
}: {
  value: number | null
  dimensionLabel: string
  disabled?: boolean
  onChange: (value: number) => void
}) {
  return (
    <Group gap={0} wrap="nowrap">
      {SCORE_VALUES.map((n, index) => {
        const isFirst = index === 0
        const isLast = index === SCORE_VALUES.length - 1
        const isSelected = value === n
        return (
          <ActionIcon
            key={n}
            size={SCORE_BUTTON_SIZE}
            variant={isSelected ? 'filled' : 'default'}
            color="blue"
            disabled={disabled}
            aria-label={`${dimensionLabel}: ${n}`}
            title={`${dimensionLabel}: ${n}`}
            onClick={() => onChange(n)}
            style={{
              borderTopLeftRadius: isFirst ? 'var(--mantine-radius-sm)' : 0,
              borderBottomLeftRadius: isFirst ? 'var(--mantine-radius-sm)' : 0,
              borderTopRightRadius: isLast ? 'var(--mantine-radius-sm)' : 0,
              borderBottomRightRadius: isLast ? 'var(--mantine-radius-sm)' : 0,
              marginLeft: isFirst ? 0 : -1,
              position: 'relative',
              zIndex: isSelected ? 1 : 0,
            }}
          >
            <Text size="xs" fw={700} style={{ fontSize: 10 }}>
              {n}
            </Text>
          </ActionIcon>
        )
      })}
    </Group>
  )
}

function ScaleHint({ lowLabel, highLabel }: { lowLabel: string; highLabel: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" style={{ width: SCORE_BUTTONS_WIDTH }}>
      <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ fontSize: 9 }}>
        {lowLabel}
      </Text>
      <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ fontSize: 9 }}>
        {highLabel}
      </Text>
    </Group>
  )
}

function DimensionRow({
  dimension,
  option,
  disabled,
  setScore,
}: {
  dimension: (typeof SCORE_DIMENSIONS)[number]
  option: OptionData
  disabled?: boolean
  setScore: ReturnType<typeof useSetScore>
}) {
  const value = option.scores?.[dimension.key] ?? null
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="xs" c="dimmed" fw={600} style={{ flexShrink: 0 }}>
        {dimension.label}
      </Text>
      <ScoreButtons
        value={value}
        dimensionLabel={dimension.label}
        disabled={disabled}
        onChange={(n) => setScore(option.id, dimension.key as ScoreDimension, n)}
      />
    </Group>
  )
}

function DimensionGroup({
  groupLabel,
  lowLabel,
  highLabel,
  dimensions,
  option,
  disabled,
  setScore,
}: {
  groupLabel: string
  lowLabel: string
  highLabel: string
  dimensions: readonly (typeof SCORE_DIMENSIONS)[number][]
  option: OptionData
  disabled?: boolean
  setScore: ReturnType<typeof useSetScore>
}) {
  return (
    <div>
      <Group justify="space-between" align="flex-end" wrap="nowrap" mb={4}>
        <Text size="xs" c="dimmed" fw={700}>
          {groupLabel.toUpperCase()}
        </Text>
        <ScaleHint lowLabel={lowLabel} highLabel={highLabel} />
      </Group>
      <Stack gap={4}>
        {dimensions.map((dimension) => (
          <DimensionRow
            key={dimension.key}
            dimension={dimension}
            option={option}
            disabled={disabled}
            setScore={setScore}
          />
        ))}
      </Stack>
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

function ScoringAccordionControl({ option }: { option: OptionData }) {
  const text = useFragmentPlainText(optionTextField(option.id))
  const total = totalScore(option.scores)
  return (
    <Group justify="space-between" align="center" wrap="nowrap" gap="xs" style={{ flex: 1 }}>
      <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
        {text || 'Untitled option'}
      </Text>
      {total !== null && (
        <Badge color="blue" variant="light" style={{ flexShrink: 0 }}>
          {total}/{MAX_TOTAL}
        </Badge>
      )}
    </Group>
  )
}

function ScoringAccordionPanel({
  option,
  advance,
  disabled,
  setScore,
}: {
  option: OptionData
  advance?: () => void
  disabled?: boolean
  setScore: ReturnType<typeof useSetScore>
}) {
  return (
    <Stack gap="xs">
      <DimensionGroup
        groupLabel="Costs"
        lowLabel="Expensive"
        highLabel="Cheap"
        dimensions={COST_DIMENSIONS}
        option={option}
        disabled={disabled}
        setScore={setScore}
      />
      <DimensionGroup
        groupLabel="Benefits"
        lowLabel="Poor"
        highLabel="Great"
        dimensions={BENEFIT_DIMENSIONS}
        option={option}
        disabled={disabled}
        setScore={setScore}
      />
      {advance && <NextButton onClick={advance} />}
    </Stack>
  )
}

/** Six-dimension scoring, always shown with the 1=bad/5=good legend pinned above the inputs —
 * an inverted, unexplained cost scale was the single biggest point of confusion in the original
 * whiteboard tool (see `docs/concept.md`). Each dimension gets its own row with 1-5 quick-pick
 * buttons rather than a numeric input, so scoring is a single click.
 *
 * Options are walked through one at a time via an Accordion (mirroring the phase "Next >" flow
 * one level down): only the active option's score breakdown is expanded, saving vertical space,
 * while the rest collapse to just their idea text and running total. As with `EvaluationColumn`,
 * that expand/collapse distinction — and its "Next >" button — is only shown while this column
 * is `active`; otherwise every item stays collapsed and undecorated, since the whole column is
 * already dimmed as a unit and the walkthrough position doesn't need to be visible to explain
 * that dimming.
 *
 * The "Next >" button always lives in the same spot — the focused option's panel — regardless
 * of what it does: while there's a next option it advances the walkthrough, and on the last
 * option it advances the phase instead. Only its action changes, never its position. */
export function ScoringColumn({ options, disabled, active, onAdvancePhase }: ScoringColumnProps) {
  const setScore = useSetScore()
  const { activeOption, nextOption, focus } = useOptionWalkthrough(options)
  const advance = nextOption ? () => focus(nextOption.id) : onAdvancePhase

  if (options.length === 0) {
    return (
      <>
        <EmptyColumnState
          icon={IconChartBar}
          title="No Numerical Trade-offs Yet"
          description="Add some options in the Options column first, or jump in anyway."
          placeholder="Placeholder scoring card"
        />
        {active && advance && <NextButton onClick={advance} />}
      </>
    )
  }

  return (
    <>
      <ScoreLegend />
      <Accordion
        value={active ? (activeOption?.id ?? null) : null}
        onChange={(value) => value && focus(value)}
        disableCollapse
        variant="separated"
      >
        {options.map((option) => (
          <Accordion.Item key={option.id} value={option.id}>
            <Accordion.Control>
              <ScoringAccordionControl option={option} />
            </Accordion.Control>
            <Accordion.Panel>
              <ScoringAccordionPanel
                option={option}
                advance={active && option.id === activeOption?.id ? advance : undefined}
                disabled={disabled}
                setScore={setScore}
              />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
      <RankingLeaderboard options={options} />
    </>
  )
}
