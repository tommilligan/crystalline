import { ActionIcon, Box, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { IconCheck, IconX } from '@tabler/icons-react'
import { useSetScore } from '../../../hooks/useBoardMutations'
import { useFragmentPlainText } from '../../../liveblocks-yjs/useFragmentPlainText'
import type { OptionData, ScoreDimension } from '../../../types/board'
import { optionBlockerField, optionEnablerField, SCORE_DIMENSIONS } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'

const COST_DIMENSIONS = SCORE_DIMENSIONS.slice(0, 3)
const BENEFIT_DIMENSIONS = SCORE_DIMENSIONS.slice(3)
const SCORE_VALUES = [1, 2, 3, 4, 5] as const
const SCORE_BUTTON_SIZE = 20
// Buttons overlap by 1px of shared border (split-button join, see Mantine's SplitButton
// example), so the row is narrower than SCORE_VALUES.length * SCORE_BUTTON_SIZE.
const SCORE_BUTTONS_WIDTH = SCORE_BUTTON_SIZE + (SCORE_VALUES.length - 1) * (SCORE_BUTTON_SIZE - 1)

function ScoreButtons({
  value,
  dimensionLabel,
  disabled,
  readOnly,
  onChange,
}: {
  value: number | null
  dimensionLabel: string
  disabled?: boolean
  /** Non-interactive but keeps the filled/default selected-vs-not styling intact — unlike
   * Mantine's own `disabled` styling, which repaints every button the same flat grey and so
   * hides which value was picked. For read-only reference views (the Decision column's summary,
   * an inlined-elsewhere column) that visibility is the entire point of showing the buttons at
   * all, so they use `readOnly` instead of `disabled`. */
  readOnly?: boolean
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
            onClick={readOnly ? undefined : () => onChange(n)}
            tabIndex={readOnly ? -1 : undefined}
            style={{
              borderTopLeftRadius: isFirst ? 'var(--mantine-radius-sm)' : 0,
              borderBottomLeftRadius: isFirst ? 'var(--mantine-radius-sm)' : 0,
              borderTopRightRadius: isLast ? 'var(--mantine-radius-sm)' : 0,
              borderBottomRightRadius: isLast ? 'var(--mantine-radius-sm)' : 0,
              marginLeft: isFirst ? 0 : -1,
              position: 'relative',
              zIndex: isSelected ? 1 : 0,
              cursor: readOnly ? 'default' : undefined,
              pointerEvents: readOnly ? 'none' : undefined,
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
  readOnly,
  setScore,
}: {
  dimension: (typeof SCORE_DIMENSIONS)[number]
  option: OptionData
  disabled?: boolean
  readOnly?: boolean
  setScore: ReturnType<typeof useSetScore>
}) {
  const value = option.scores?.[dimension.key] ?? null
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="xs" fw={600} style={{ flexShrink: 0 }}>
        {dimension.label}
      </Text>
      <ScoreButtons
        value={value}
        dimensionLabel={dimension.label}
        disabled={disabled}
        readOnly={readOnly}
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
  readOnly,
  setScore,
}: {
  groupLabel: string
  lowLabel: string
  highLabel: string
  dimensions: readonly (typeof SCORE_DIMENSIONS)[number][]
  option: OptionData
  disabled?: boolean
  readOnly?: boolean
  setScore: ReturnType<typeof useSetScore>
}) {
  return (
    <div>
      <Group justify="space-between" align="flex-end" wrap="nowrap" mb={4}>
        <Title order={5} size="xs">
          {groupLabel.toUpperCase()}
        </Title>
        <ScaleHint lowLabel={lowLabel} highLabel={highLabel} />
      </Group>
      <Stack gap={4}>
        {dimensions.map((dimension) => (
          <DimensionRow
            key={dimension.key}
            dimension={dimension}
            option={option}
            disabled={disabled}
            readOnly={readOnly}
            setScore={setScore}
          />
        ))}
      </Stack>
    </div>
  )
}

/** A single option's Good/Bad enabler/blocker fields — the Evaluation column's own content,
 * reused (always non-editable) wherever a later column inlines it instead of showing its own
 * Evaluation column, per `columnLayout.ts`'s "collapse once inlined elsewhere" rule. */
export function EvaluationFields({ option, disabled }: { option: OptionData; disabled?: boolean }) {
  return (
    <Group gap="xs" align="flex-start" grow wrap="nowrap">
      <Box>
        <Group gap={6} mb={4}>
          <Title order={5} size="xs">
            Good
          </Title>
          <ThemeIcon size={16} radius="xl" color="teal" variant="filled">
            <IconCheck size={11} />
          </ThemeIcon>
        </Group>
        <CollaborativeTextField
          field={optionEnablerField(option.id)}
          placeholder="What helps or supports this option?"
          disabled={disabled}
          minRows={2}
        />
      </Box>
      <Box>
        <Group gap={6} mb={4}>
          <Title order={5} size="xs">
            Bad
          </Title>
          <ThemeIcon size={16} radius="xl" color="red" variant="filled">
            <IconX size={11} />
          </ThemeIcon>
        </Group>
        <CollaborativeTextField
          field={optionBlockerField(option.id)}
          placeholder="What limits or risks this option?"
          disabled={disabled}
          minRows={2}
        />
      </Box>
    </Group>
  )
}

/** A single option's six-dimension cost/benefit scoring — the Scoring column's own content,
 * reused wherever a later column inlines it instead of showing its own Scoring column, per
 * `columnLayout.ts`'s "collapse once inlined elsewhere" rule. Pass `disabled` for the Scoring
 * column's own panel (genuinely un-editable, e.g. a signed board) and `readOnly` for a pure
 * reference view (the Decision column's summary) — see `ScoreButtons` for why they differ. */
export function ScoringFields({
  option,
  disabled,
  readOnly,
}: {
  option: OptionData
  disabled?: boolean
  readOnly?: boolean
}) {
  const setScore = useSetScore()
  return (
    <Group gap="lg" align="flex-start" grow wrap="wrap">
      <DimensionGroup
        groupLabel="Costs"
        lowLabel="Expensive"
        highLabel="Cheap"
        dimensions={COST_DIMENSIONS}
        option={option}
        disabled={disabled}
        readOnly={readOnly}
        setScore={setScore}
      />
      <DimensionGroup
        groupLabel="Benefits"
        lowLabel="Poor"
        highLabel="Good"
        dimensions={BENEFIT_DIMENSIONS}
        option={option}
        disabled={disabled}
        readOnly={readOnly}
        setScore={setScore}
      />
    </Group>
  )
}

function SummaryDots({ value }: { value: number | null }) {
  return (
    <Group gap={3} wrap="nowrap">
      {SCORE_VALUES.map((n) => (
        <Box
          key={n}
          w={8}
          h={8}
          style={{
            borderRadius: '50%',
            backgroundColor:
              value !== null && n <= value
                ? 'var(--mantine-color-blue-6)'
                : 'var(--mantine-color-gray-3)',
          }}
        />
      ))}
    </Group>
  )
}

function SummaryDimensionRow({
  dimension,
  value,
}: {
  dimension: (typeof SCORE_DIMENSIONS)[number]
  value: number | null
}) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="xs" fw={600} style={{ flexShrink: 0 }}>
        {dimension.label}
      </Text>
      <Group gap={6} wrap="nowrap">
        <SummaryDots value={value} />
        <Text size="xs" fw={600} style={{ width: 14, textAlign: 'right' }}>
          {value ?? '–'}
        </Text>
      </Group>
    </Group>
  )
}

function SummaryDimensionGroup({
  groupLabel,
  dimensions,
  option,
}: {
  groupLabel: string
  dimensions: readonly (typeof SCORE_DIMENSIONS)[number][]
  option: OptionData
}) {
  return (
    <div>
      <Title order={5} size="xs" mb={4}>
        {groupLabel.toUpperCase()}
      </Title>
      <Stack gap={4}>
        {dimensions.map((dimension) => (
          <SummaryDimensionRow
            key={dimension.key}
            dimension={dimension}
            value={option.scores?.[dimension.key] ?? null}
          />
        ))}
      </Stack>
    </div>
  )
}

/** Plain, non-interactive readout of an option's Good/Bad evaluation — for pure reference views
 * (the Decision column's summary, the printable export) where there's nothing to edit and the
 * `CollaborativeTextField` editor chrome `EvaluationFields` renders would only get in the way.
 * Reads the same Yjs fragments `EvaluationFields` edits, just as plain text. */
export function EvaluationSummary({ option }: { option: OptionData }) {
  const enablerText = useFragmentPlainText(optionEnablerField(option.id))
  const blockerText = useFragmentPlainText(optionBlockerField(option.id))
  return (
    <Group gap="xs" align="flex-start" grow wrap="nowrap">
      <Box>
        <Group gap={6} mb={4}>
          <Title order={5} size="xs">
            Good
          </Title>
          <ThemeIcon size={16} radius="xl" color="teal" variant="filled">
            <IconCheck size={11} />
          </ThemeIcon>
        </Group>
        <Text size="sm" c={enablerText ? undefined : 'dimmed'} style={{ whiteSpace: 'pre-wrap' }}>
          {enablerText || 'Nothing noted'}
        </Text>
      </Box>
      <Box>
        <Group gap={6} mb={4}>
          <Title order={5} size="xs">
            Bad
          </Title>
          <ThemeIcon size={16} radius="xl" color="red" variant="filled">
            <IconX size={11} />
          </ThemeIcon>
        </Group>
        <Text size="sm" c={blockerText ? undefined : 'dimmed'} style={{ whiteSpace: 'pre-wrap' }}>
          {blockerText || 'Nothing noted'}
        </Text>
      </Box>
    </Group>
  )
}

/** Plain, non-interactive readout of an option's six-dimension scoring — the counterpart to
 * `EvaluationSummary` for the same pure-reference views. Dots give an at-a-glance shape without
 * relying on color alone; the number is always printed alongside them too, so this also holds up
 * in print/export where color may not render or be legible. */
export function ScoringSummary({ option }: { option: OptionData }) {
  return (
    <Group gap="lg" align="flex-start" grow wrap="wrap">
      <SummaryDimensionGroup groupLabel="Costs" dimensions={COST_DIMENSIONS} option={option} />
      <SummaryDimensionGroup
        groupLabel="Benefits"
        dimensions={BENEFIT_DIMENSIONS}
        option={option}
      />
    </Group>
  )
}
