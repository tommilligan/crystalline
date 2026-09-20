import { ActionIcon, Box, Group, Stack, Text, Title, Tooltip } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconQuestionMark } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { useId } from 'react'
import { useSetScore } from '../../../hooks/useBoardMutations'
import { useFragmentPlainText } from '../../../liveblocks-yjs/useFragmentPlainText'
import type { OptionData, RatingProperty } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'

// Pros/Cons vs. rating-scores column widths within `EvaluationBody`/`EvaluationSummaryBody`,
// as flex-grow shares (8:4, i.e. 2:1) — Pros/Cons is prose and wants the room, the rating rows
// are a label plus a fixed-width button strip and don't.
const EVALUATION_BODY_FLEX = { goodBad: 8, ratings: 4 }

// Below this, the two-column layout leaves the ratings column too narrow to show its property
// labels alongside the fixed-width score-button strip (`SCORE_BUTTONS_WIDTH`) — the labels
// truncate to nothing while the buttons, which can't shrink, stay visible. Stack the two columns
// instead so ratings get the full card width, same idea as the board's row/stacked breakpoint in
// `BoardLayout.tsx` (that one's at 1100px, for the column row vs. column stack).
const EVALUATION_NARROW_QUERY = '(max-width: 600px)'

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

function ScaleHint() {
  return (
    <Group gap={4} wrap="nowrap">
      <Tooltip
        label={
          <Stack gap={4}>
            <Text size="xs" inherit>
              5 indicates a good option, like a cheap cost or high quality. 1 indicates a bad
              option, such as taking a lot of time or needing a lot of people.
            </Text>
            <Text size="xs" inherit>
              Don't think about the numbers too hard, go with your gut - you can always change them
              later.
            </Text>
          </Stack>
        }
        multiline
        w={240}
        withArrow
      >
        <ActionIcon variant="subtle" color="gray" size={14} aria-label="How scoring works">
          <IconQuestionMark size={10} />
        </ActionIcon>
      </Tooltip>
      <Group justify="space-between" wrap="nowrap" style={{ width: SCORE_BUTTONS_WIDTH }}>
        <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ fontSize: 9 }}>
          Bad
        </Text>
        <Text size="xs" c="dimmed" fw={700} tt="uppercase" style={{ fontSize: 9 }}>
          Good
        </Text>
      </Group>
    </Group>
  )
}

function RatingRow({
  property,
  option,
  disabled,
  setScore,
}: {
  property: RatingProperty
  option: OptionData
  disabled?: boolean
  setScore: ReturnType<typeof useSetScore>
}) {
  const value = option.scores?.[property.id] ?? null
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="xs" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
        {property.label}
      </Text>
      <ScoreButtons
        value={value}
        dimensionLabel={property.label}
        disabled={disabled}
        onChange={(n) => setScore(option.id, property.id, n)}
      />
    </Group>
  )
}

/** A single option's Pros/Cons enabler/blocker fields, stacked one above the other — this is
 * "column one" of the Evaluation column's two-column per-option layout, "column two" being
 * `RatingsFields`. Reused (always non-editable) wherever a later column inlines it instead of
 * showing its own Evaluation column. */
function GoodBadFields({ option, disabled }: { option: OptionData; disabled?: boolean }) {
  const prosId = useId()
  const consId = useId()
  return (
    <Stack gap="sm">
      <Box>
        <Title id={prosId} order={5} size="xs" mb={4}>
          Pros
        </Title>
        <CollaborativeTextField
          fragment={option.enablerFragment}
          placeholder="What helps or supports this option?"
          disabled={disabled}
          minRows={2}
          ariaLabelledBy={prosId}
        />
      </Box>
      <Box>
        <Title id={consId} order={5} size="xs" mb={4}>
          Cons
        </Title>
        <CollaborativeTextField
          fragment={option.blockerFragment}
          placeholder="What limits or risks this option?"
          disabled={disabled}
          minRows={2}
          ariaLabelledBy={consId}
        />
      </Box>
    </Stack>
  )
}

/** A single option's numeric ratings, one row per configured property, stacked in a single
 * column — "column two" of the Evaluation column's per-option layout, alongside `GoodBadFields`. */
function RatingsFields({
  option,
  properties,
  disabled,
}: {
  option: OptionData
  properties: readonly RatingProperty[]
  disabled?: boolean
}) {
  const setScore = useSetScore()
  if (properties.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No rating properties configured — add some above.
      </Text>
    )
  }
  return (
    <Stack gap={6}>
      <Group justify="flex-end">
        <ScaleHint />
      </Group>
      {properties.map((property) => (
        <RatingRow
          key={property.id}
          property={property}
          option={option}
          disabled={disabled}
          setScore={setScore}
        />
      ))}
    </Stack>
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
                ? 'var(--mantine-color-blue-filled)'
                : 'var(--mantine-color-default-border)',
          }}
        />
      ))}
    </Group>
  )
}

function RatingSummaryRow({ property, value }: { property: RatingProperty; value: number | null }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Text size="xs" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
        {property.label}
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

/** Plain, non-interactive readout of an option's Pros/Cons evaluation — for pure reference views
 * (the Decision column's read-only reference copy of Evaluation, the printable export) where
 * there's nothing to edit and the `CollaborativeTextField` editor chrome `GoodBadFields` renders
 * would only get in the way. Reads the same Yjs fragments `GoodBadFields` edits, just as plain
 * text. */
function GoodBadSummary({ option }: { option: OptionData }) {
  const enablerText = useFragmentPlainText(option.enablerFragment)
  const blockerText = useFragmentPlainText(option.blockerFragment)
  return (
    <Stack gap="sm">
      <Box>
        <Title order={5} size="xs" mb={4}>
          Pros
        </Title>
        <Text size="sm" c={enablerText ? undefined : 'dimmed'} style={{ whiteSpace: 'pre-wrap' }}>
          {enablerText || 'Nothing noted'}
        </Text>
      </Box>
      <Box>
        <Title order={5} size="xs" mb={4}>
          Cons
        </Title>
        <Text size="sm" c={blockerText ? undefined : 'dimmed'} style={{ whiteSpace: 'pre-wrap' }}>
          {blockerText || 'Nothing noted'}
        </Text>
      </Box>
    </Stack>
  )
}

/** Plain, non-interactive readout of an option's numeric ratings — the counterpart to
 * `GoodBadSummary` for the same pure-reference views. Dots give an at-a-glance shape without
 * relying on color alone; the number is always printed alongside them too, so this also holds up
 * in print/export where color may not render or be legible. */
function RatingsSummary({
  option,
  properties,
}: {
  option: OptionData
  properties: readonly RatingProperty[]
}) {
  if (properties.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No rating properties configured.
      </Text>
    )
  }
  return (
    <Stack gap={6}>
      {properties.map((property) => (
        <RatingSummaryRow
          key={property.id}
          property={property}
          value={option.scores?.[property.id] ?? null}
        />
      ))}
    </Stack>
  )
}

/** The two-column (Pros/Cons, then ratings) layout shared by `EvaluationBody` and
 * `EvaluationSummaryBody` — side by side above `EVALUATION_NARROW_QUERY`, stacked full-width
 * below it (see that constant for why). */
function EvaluationTwoColumnLayout({
  goodBad,
  ratings,
}: {
  goodBad: ReactNode
  ratings: ReactNode
}) {
  const isNarrow = useMediaQuery(EVALUATION_NARROW_QUERY, false)
  return (
    <Group
      align="flex-start"
      gap="lg"
      wrap="wrap"
      style={isNarrow ? { flexDirection: 'column' } : undefined}
    >
      <Box
        style={{
          flex: EVALUATION_BODY_FLEX.goodBad,
          minWidth: 0,
          width: isNarrow ? '100%' : undefined,
        }}
      >
        {goodBad}
      </Box>
      <Box
        style={{
          flex: EVALUATION_BODY_FLEX.ratings,
          minWidth: 0,
          width: isNarrow ? '100%' : undefined,
        }}
      >
        {ratings}
      </Box>
    </Group>
  )
}

/** The Evaluation column's full per-option body: Pros/Cons stacked in one column, all numeric
 * ratings stacked in the other, side by side. Shared between the editable walkthrough
 * (`EvaluationColumn`) and the read-only reference/export views below. */
export function EvaluationBody({
  option,
  properties,
  disabled,
}: {
  option: OptionData
  properties: readonly RatingProperty[]
  disabled?: boolean
}) {
  return (
    <EvaluationTwoColumnLayout
      goodBad={<GoodBadFields option={option} disabled={disabled} />}
      ratings={<RatingsFields option={option} properties={properties} disabled={disabled} />}
    />
  )
}

/** The read-only counterpart to `EvaluationBody` — same two-column layout, plain text and dots
 * instead of editable fields. Used by `EvaluationColumn`'s reference view (once Decision is
 * selected) and by the printable export. */
export function EvaluationSummaryBody({
  option,
  properties,
}: {
  option: OptionData
  properties: readonly RatingProperty[]
}) {
  return (
    <EvaluationTwoColumnLayout
      goodBad={<GoodBadSummary option={option} />}
      ratings={<RatingsSummary option={option} properties={properties} />}
    />
  )
}
