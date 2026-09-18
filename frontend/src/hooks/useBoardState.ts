import { useCallback, useMemo } from 'react'
import type * as Y from 'yjs'
import { useBoardDoc } from '../board-doc/BoardDocContext'
import {
  getDecisionMap,
  getMetaMap,
  getNextStepsArray,
  getOptionsArray,
  getRatingPropertiesArray,
  getSituationFragment,
  getTimerMap,
  readDecision,
  readMeta,
  readNextStep,
  readOption,
  readRatingProperty,
  readTimer,
} from '../lib/boardDoc'
import type {
  DecisionData,
  NextStepData,
  OptionData,
  RatingProperty,
  ScoreSet,
} from '../types/board'
import { totalScore } from '../types/board'
import { arrayEqual, shallowEqualObject, useYObserver } from './useYObserver'

function scoresEqual(a: ScoreSet, b: ScoreSet): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => a[key] === b[key])
}

/** Ignores text-content changes within `idea`/`enabler`/`blocker` (fragment references are
 * stable across edits — see `useYObserver`'s doc comment) so typing in any option's text doesn't
 * cascade into every `useBoardOptions` consumer re-rendering. */
function optionEqual(a: OptionData, b: OptionData): boolean {
  return (
    a.id === b.id &&
    a.createdAt === b.createdAt &&
    a.ideaFragment === b.ideaFragment &&
    a.enablerFragment === b.enablerFragment &&
    a.blockerFragment === b.blockerFragment &&
    scoresEqual(a.scores, b.scores)
  )
}

/** Same reasoning as `optionEqual`, for `countermeasure`/`dissent`. */
function decisionEqual(a: DecisionData, b: DecisionData): boolean {
  return (
    a.chosenOptionId === b.chosenOptionId &&
    a.approvedBy === b.approvedBy &&
    a.date === b.date &&
    a.agreement === b.agreement &&
    a.countermeasureFragment === b.countermeasureFragment &&
    a.dissentFragment === b.dissentFragment
  )
}

const optionsEqual = arrayEqual(optionEqual)
const ratingPropertiesEqual = arrayEqual(shallowEqualObject<RatingProperty>)
const nextStepsEqual = arrayEqual(shallowEqualObject<NextStepData>)

export function useBoardTitle(): string {
  const { doc } = useBoardDoc()
  const meta = getMetaMap(doc)
  const select = useCallback(() => readMeta(meta).title, [meta])
  return useYObserver(meta, select)
}

export function useBoardLifecycle(): { state: string; signedAt: string | null } {
  const { doc } = useBoardDoc()
  const meta = getMetaMap(doc)
  const select = useCallback(() => {
    const fields = readMeta(meta)
    return { state: fields.lifecycleState, signedAt: fields.signedAt }
  }, [meta])
  return useYObserver(meta, select, shallowEqualObject)
}

export function useBoardOptions(): readonly OptionData[] {
  const { doc } = useBoardDoc()
  const array = getOptionsArray(doc)
  const select = useCallback(() => array.toArray().map(readOption), [array])
  return useYObserver(array, select, optionsEqual)
}

export function useRatingProperties(): readonly RatingProperty[] {
  const { doc } = useBoardDoc()
  const array = getRatingPropertiesArray(doc)
  const select = useCallback(() => array.toArray().map(readRatingProperty), [array])
  return useYObserver(array, select, ratingPropertiesEqual)
}

export function useBoardDecision(): DecisionData {
  const { doc } = useBoardDoc()
  const map = getDecisionMap(doc)
  const select = useCallback(() => readDecision(map), [map])
  return useYObserver(map, select, decisionEqual)
}

export function useNextSteps(): readonly NextStepData[] {
  const { doc } = useBoardDoc()
  const array = getNextStepsArray(doc)
  const select = useCallback(() => array.toArray().map(readNextStep), [array])
  return useYObserver(array, select, nextStepsEqual)
}

export function useNextStepsCommitted(): { committed: boolean; committedAt: string | null } {
  const { doc } = useBoardDoc()
  const meta = getMetaMap(doc)
  const select = useCallback(() => {
    const fields = readMeta(meta)
    return { committed: fields.nextStepsCommitted, committedAt: fields.nextStepsCommittedAt }
  }, [meta])
  return useYObserver(meta, select, shallowEqualObject)
}

export function useBoardTimer() {
  const { doc } = useBoardDoc()
  const map = getTimerMap(doc)
  const select = useCallback(() => readTimer(map), [map])
  return useYObserver(map, select, shallowEqualObject)
}

export function useBoardSituationAgreed(): boolean {
  const { doc } = useBoardDoc()
  const meta = getMetaMap(doc)
  const select = useCallback(() => readMeta(meta).situationAgreed, [meta])
  return useYObserver(meta, select)
}

/** The problem statement's live text fragment — a stable reference for the life of the doc (see
 * `lib/boardDoc.ts`), so this doesn't need to be a reactive subscription itself; components that
 * need the fragment's *text* reactively should pass it to `useFragmentPlainText`. */
export function useSituationFragment(): Y.XmlFragment {
  const { doc } = useBoardDoc()
  return useMemo(() => getSituationFragment(doc), [doc])
}

/** Options ordered by total score, highest first; options without a score sort last. Purely
 * derived from `useBoardOptions`/`useRatingProperties` — no separate doc subscription needed. */
export function useRankedOptions(): readonly OptionData[] {
  const options = useBoardOptions()
  const properties = useRatingProperties()
  return useMemo(
    () =>
      [...options].sort((a, b) => {
        const totalA = totalScore(a.scores, properties)
        const totalB = totalScore(b.scores, properties)
        if (totalA === null && totalB === null) return 0
        if (totalA === null) return 1
        if (totalB === null) return -1
        return totalB - totalA
      }),
    [options, properties],
  )
}
