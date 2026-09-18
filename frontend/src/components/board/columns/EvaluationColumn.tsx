import { Accordion, Stack, Title } from '@mantine/core'
import { useEffect, useMemo, useRef } from 'react'
import { useOptionWalkthrough } from '../../../hooks/useOptionWalkthrough'
import {
  useFragmentPlainText,
  useFragmentPlainTexts,
} from '../../../liveblocks-yjs/useFragmentPlainText'
import type { OptionData, RatingProperty } from '../../../types/board'
import { optionDisplayId } from '../../../types/board'
import { EmptyColumnState } from '../EmptyColumnState'
import { NextButton } from '../NextButton'
import { EvaluationBody, EvaluationSummaryBody } from './OptionSummaries'
import { RatingPropertiesPicker } from './RatingPropertiesPicker'

interface EvaluationColumnProps {
  options: readonly OptionData[]
  properties: readonly RatingProperty[]
  disabled?: boolean
  active?: boolean
  /** True while Decision (the next phase) is the one selected: this column stays expanded
   * alongside it as a read-only reference (see `columnLayout.ts`) rather than collapsing to a
   * sliver, showing every option's evaluation at once instead of the one-at-a-time walkthrough. */
  reference?: boolean
  /** The Decision column's currently-selected option, while `reference` is true — that option's
   * panel here is highlighted green (matching `DecisionColumn`'s leaderboard row) and scrolled
   * into view whenever the selection changes, so picking an option in the leaderboard surfaces
   * its evaluation detail even if it's currently scrolled out of view. Purely a one-off nudge,
   * not a pinned/sticky position — the viewer is free to scroll away afterwards. */
  chosenOptionId?: string | null
  onAdvancePhase?: () => void
}

function EvaluationAccordionControl({
  option,
  displayId,
}: {
  option: OptionData
  displayId: string
}) {
  const text = useFragmentPlainText(option.ideaFragment)
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
      {displayId}: {text || 'Untitled option'}
    </Title>
  )
}

function EvaluationAccordionPanel({
  option,
  properties,
  advance,
  disabled,
}: {
  option: OptionData
  properties: readonly RatingProperty[]
  advance?: () => void
  disabled?: boolean
}) {
  return (
    <Stack gap="xs">
      <EvaluationBody option={option} properties={properties} disabled={disabled} />
      {advance && <NextButton onClick={advance} />}
    </Stack>
  )
}

/** Pros/Cons plus numeric ratings, walked through one option at a time via an Accordion (mirroring
 * the phase-to-phase "Next >" flow one level down): only the active option's fields are expanded,
 * the rest collapse to just their idea text, and clicking into any option (or the "Next >"
 * button) advances which one is focused. Each option's panel is laid out as two columns —
 * Pros/Cons stacked on the left, every configured rating property stacked on the right (see
 * `EvaluationBody`) — with the rating properties themselves configured via
 * `RatingPropertiesPicker` at the top of the column.
 *
 * That expand/collapse distinction, the properties picker, and the "Next >" button are only
 * shown while this column itself is `active` (the selected phase) — otherwise every item stays
 * collapsed and undecorated, since the whole column is already dimmed as a unit by
 * `BoardColumnShell`. The walkthrough position is still tracked while inactive, just not
 * displayed.
 *
 * Once Decision becomes the selected phase, this column switches to `reference` mode instead:
 * every option's evaluation is shown at once, read-only, in the same two-column layout — see
 * `EvaluationSummaryBody` — so `DecisionColumn` doesn't need to repeat any of this detail itself.
 *
 * The "Next >" button always lives in the same spot — the focused option's panel — regardless of
 * what it does: while there's a next option it advances the walkthrough, and on the last option
 * it advances the phase instead. Only its action changes, never its position. */
export function EvaluationColumn({
  options,
  properties,
  disabled,
  active,
  reference,
  chosenOptionId,
  onAdvancePhase,
}: EvaluationColumnProps) {
  const chosenItemRefs = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    if (!reference || !chosenOptionId) return
    chosenItemRefs.current.get(chosenOptionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [reference, chosenOptionId])

  const evaluationFragments = useMemo(
    () => options.flatMap((option) => [option.enablerFragment, option.blockerFragment]),
    [options],
  )
  const evaluationTexts = useFragmentPlainTexts(evaluationFragments)
  const hasOptionData = options.map(
    (option, index) =>
      Boolean(evaluationTexts[2 * index]) ||
      Boolean(evaluationTexts[2 * index + 1]) ||
      Object.keys(option.scores).length > 0,
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

  if (reference) {
    // Controlled (not `defaultValue`) and pinned open: this is a read-only reference view, every
    // option should always show fully expanded, regardless of whatever accordion state happened
    // to exist before this column switched into `reference` mode — `defaultValue` only applies on
    // an accordion's first mount, which isn't reliably "now" (e.g. on a page reload landing
    // directly on Decision, this column can render once already-collapsed before settling into
    // `reference`, and an uncontrolled `defaultValue` would then never reopen it).
    const allOptionIds = options.map((option) => option.id)
    return (
      <Accordion multiple value={allOptionIds} onChange={() => {}} variant="separated">
        {options.map((option, index) => {
          const chosen = option.id === chosenOptionId
          return (
            <Accordion.Item
              key={option.id}
              value={option.id}
              ref={(node) => {
                if (node) chosenItemRefs.current.set(option.id, node)
                else chosenItemRefs.current.delete(option.id)
              }}
              style={{
                borderColor: chosen ? 'var(--mantine-color-green-6)' : undefined,
                borderWidth: chosen ? 2 : undefined,
                background: chosen ? 'var(--mantine-color-green-0)' : undefined,
              }}
            >
              <Accordion.Control>
                <EvaluationAccordionControl option={option} displayId={optionDisplayId(index)} />
              </Accordion.Control>
              <Accordion.Panel>
                <EvaluationSummaryBody option={option} properties={properties} />
              </Accordion.Panel>
            </Accordion.Item>
          )
        })}
      </Accordion>
    )
  }

  return (
    <>
      {active && <RatingPropertiesPicker properties={properties} disabled={disabled} />}
      <Accordion
        value={active ? (activeOption?.id ?? null) : null}
        onChange={(value) => value && focus(value)}
        disableCollapse
        variant="separated"
      >
        {options.map((option, index) => (
          <Accordion.Item key={option.id} value={option.id}>
            <Accordion.Control>
              <EvaluationAccordionControl option={option} displayId={optionDisplayId(index)} />
            </Accordion.Control>
            <Accordion.Panel>
              <EvaluationAccordionPanel
                option={option}
                properties={properties}
                advance={active && option.id === activeOption?.id ? advance : undefined}
                disabled={disabled}
              />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </>
  )
}
