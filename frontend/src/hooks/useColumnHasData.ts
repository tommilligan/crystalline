import { useMemo } from 'react'
import {
  useAnyFragmentsNonEmpty,
  useFragmentPlainText,
} from '../liveblocks-yjs/useFragmentPlainText'
import type { DecisionData, NextStepData, OptionData, Phase } from '../types/board'
import { nextStepHasContent } from '../types/board'
import { useSituationFragment } from './useBoardState'

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
  const situationText = useFragmentPlainText(useSituationFragment())

  const evaluationFragments = useMemo(
    () => options.flatMap((option) => [option.enablerFragment, option.blockerFragment]),
    [options],
  )
  const hasEvaluationText = useAnyFragmentsNonEmpty(evaluationFragments)
  const hasDecisionText = useAnyFragmentsNonEmpty([
    decision.countermeasureFragment,
    decision.dissentFragment,
  ])

  const hasScores = options.some((option) => Object.keys(option.scores).length > 0)
  const hasDecisionFields =
    Boolean(decision.chosenOptionId) ||
    Boolean(decision.approvedBy?.trim()) ||
    Boolean(decision.agreement) ||
    // Not just `nextSteps.length > 0`: the Decision column always keeps at least one blank row
    // present (see `DecisionColumn`), so an untouched blank row shouldn't count as real data.
    nextSteps.some(nextStepHasContent)

  return {
    situation: situationText !== '',
    ideation: options.length > 0,
    evaluation: hasEvaluationText || hasScores,
    decision: hasDecisionFields || hasDecisionText,
  }
}
