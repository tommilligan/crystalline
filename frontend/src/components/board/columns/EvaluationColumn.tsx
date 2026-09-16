import { Accordion, Stack, Title } from '@mantine/core'
import { useMemo } from 'react'
import { useOptionWalkthrough } from '../../../hooks/useOptionWalkthrough'
import {
  useFragmentPlainText,
  useFragmentPlainTexts,
} from '../../../liveblocks-yjs/useFragmentPlainText'
import type { OptionData } from '../../../types/board'
import { optionBlockerField, optionEnablerField, optionTextField } from '../../../types/board'
import { EmptyColumnState } from '../EmptyColumnState'
import { NextButton } from '../NextButton'
import { EvaluationFields } from './OptionSummaries'

interface EvaluationColumnProps {
  options: readonly OptionData[]
  disabled?: boolean
  active?: boolean
  onAdvancePhase?: () => void
}

function EvaluationAccordionControl({ option }: { option: OptionData }) {
  const text = useFragmentPlainText(optionTextField(option.id))
  return (
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
      {text || 'Untitled option'}
    </Title>
  )
}

function EvaluationAccordionPanel({
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
      <EvaluationFields option={option} disabled={disabled} />
      {advance && <NextButton onClick={advance} />}
    </Stack>
  )
}

/** Enabler/blocker assessment, walked through one option at a time via an Accordion (mirroring
 * the phase-to-phase "Next >" flow one level down and matching `ScoringColumn`'s pattern): only
 * the active option's Good/Bad fields are expanded, the rest collapse to just their idea text,
 * and clicking into any option (or the "Next >" button) advances which one is focused. That
 * expand/collapse distinction — and its "Next >" button — is only shown while this column itself
 * is `active` (the selected phase) — otherwise every item stays collapsed and undecorated, since
 * the whole column is already dimmed as a unit by `BoardColumnShell`. The walkthrough position is
 * still tracked while inactive, just not displayed.
 *
 * The "Next >" button always lives in the same spot — the focused option's panel — regardless of
 * what it does: while there's a next option it advances the walkthrough, and on the last option
 * it advances the phase instead. Only its action changes, never its position. */
export function EvaluationColumn({
  options,
  disabled,
  active,
  onAdvancePhase,
}: EvaluationColumnProps) {
  const evaluationFields = useMemo(
    () =>
      options.flatMap((option) => [optionEnablerField(option.id), optionBlockerField(option.id)]),
    [options],
  )
  const evaluationTexts = useFragmentPlainTexts(evaluationFields)
  const hasOptionData = options.map(
    (_, index) => Boolean(evaluationTexts[2 * index]) || Boolean(evaluationTexts[2 * index + 1]),
  )
  const { activeOption, nextOption, focus } = useOptionWalkthrough(options, hasOptionData)
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
            <EvaluationAccordionControl option={option} />
          </Accordion.Control>
          <Accordion.Panel>
            <EvaluationAccordionPanel
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
