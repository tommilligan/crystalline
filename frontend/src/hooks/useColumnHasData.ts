import { useMemo } from 'react'
import {
  useAnyFragmentsNonEmpty,
  useFragmentPlainText,
} from '../liveblocks-yjs/useFragmentPlainText'
import type { DecisionData, NextStepData, OptionData, Phase } from '../types/board'
import {
  COUNTERMEASURE_FIELD,
  DISSENT_FIELD,
  optionBlockerField,
  optionEnablerField,
  SITUATION_FIELD,
} from '../types/board'

/**
 * Whether each column holds real user input yet, for the auto-collapse layout in
 * `columnLayout.ts`. A column that already has data must stay visible even once the user has
 * navigated elsewhere, so nothing they've entered silently disappears.
 */
export function useColumnHasData(
  options: readonly OptionData[],
  decision: DecisionData,
  nextSteps: readonly NextStepData[],
): Record<Phase, boolean> {
  const situationText = useFragmentPlainText(SITUATION_FIELD)

  const evaluationFields = useMemo(
    () =>
      options.flatMap((option) => [optionEnablerField(option.id), optionBlockerField(option.id)]),
    [options],
  )
  const hasEvaluationText = useAnyFragmentsNonEmpty(evaluationFields)
  const hasDecisionText = useAnyFragmentsNonEmpty([COUNTERMEASURE_FIELD, DISSENT_FIELD])

  const hasScores = options.some((option) => option.scores !== null)
  const hasDecisionFields =
    Boolean(decision.chosenOptionId) ||
    Boolean(decision.approvedBy?.trim()) ||
    Boolean(decision.agreement) ||
    nextSteps.length > 0

  return {
    situation: situationText !== '',
    ideation: options.length > 0,
    evaluation: hasEvaluationText || hasScores,
    decision: hasDecisionFields || hasDecisionText,
  }
}
