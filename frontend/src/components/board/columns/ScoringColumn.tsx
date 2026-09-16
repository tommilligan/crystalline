import { Accordion, Group, Stack, Text } from '@mantine/core'
import { useOptionWalkthrough } from '../../../hooks/useOptionWalkthrough'
import { useFragmentPlainText } from '../../../liveblocks-yjs/useFragmentPlainText'
import type { OptionData } from '../../../types/board'
import { optionTextField } from '../../../types/board'
import { EmptyColumnState } from '../EmptyColumnState'
import { NextButton } from '../NextButton'
import { EvaluationFields, ScoringFields } from './OptionSummaries'

interface ScoringColumnProps {
  options: readonly OptionData[]
  disabled?: boolean
  active?: boolean
  onAdvancePhase?: () => void
}

function ScoringAccordionControl({ option }: { option: OptionData }) {
  const text = useFragmentPlainText(optionTextField(option.id))
  return (
    <Group justify="space-between" align="center" wrap="nowrap" gap="xs" style={{ flex: 1 }}>
      <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
        {text || 'Untitled option'}
      </Text>
    </Group>
  )
}

function ScoringAccordionPanel({
  option,
  advance,
  disabled,
}: {
  option: OptionData
  advance?: () => void
  disabled?: boolean
}) {
  return (
    <Stack gap="xs">
      <EvaluationFields option={option} disabled />
      <ScoringFields option={option} disabled={disabled} />
      {advance && <NextButton onClick={advance} />}
    </Stack>
  )
}

/** Six-dimension scoring, 1=bad/5=good on every dimension including costs (see
 * `docs/concept.md`). Each dimension gets its own row with 1-5 quick-pick buttons rather than a
 * numeric input, so scoring is a single click.
 *
 * Options are walked through one at a time via an Accordion (mirroring the phase "Next >" flow
 * one level down): only the active option's score breakdown is expanded, saving vertical space,
 * while the rest collapse to just their idea text. As with `EvaluationColumn`, that
 * expand/collapse distinction — and its "Next >" button — is only shown while this column is
 * `active`; otherwise every item stays collapsed and undecorated, since the whole column is
 * already dimmed as a unit and the walkthrough position doesn't need to be visible to explain
 * that dimming.
 *
 * Each option's panel also inlines a read-only copy of its Evaluation (Good/Bad) fields, since
 * `columnLayout.ts` fully collapses the Evaluation column once Scoring is reached — this is the
 * only place that information stays visible from here on. Ranking by score now happens visually
 * in the Decision column instead of a leaderboard here (see `DecisionColumn`'s "Summary of
 * options" section).
 *
 * The "Next >" button always lives in the same spot — the focused option's panel — regardless
 * of what it does: while there's a next option it advances the walkthrough, and on the last
 * option it advances the phase instead. Only its action changes, never its position. */
export function ScoringColumn({ options, disabled, active, onAdvancePhase }: ScoringColumnProps) {
  const { activeOption, nextOption, focus } = useOptionWalkthrough(options)
  const advance = nextOption ? () => focus(nextOption.id) : onAdvancePhase

  if (options.length === 0) {
    return (
      <>
        <EmptyColumnState />
        {active && advance && <NextButton onClick={advance} />}
      </>
    )
  }

  return (
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
            />
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
