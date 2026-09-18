import { shallow } from '@liveblocks/react'
import { useStorage } from '../liveblocks.config'
import type { OptionData, RatingProperty } from '../types/board'
import { totalScore } from '../types/board'

export function useBoardTitle() {
  return useStorage((root) => root.title)
}

export function useBoardLifecycle() {
  return useStorage((root) => ({ state: root.lifecycleState, signedAt: root.signedAt }), shallow)
}

export function useBoardOptions(): readonly OptionData[] {
  // Cast needed because `ScoreSet`'s `string` index signature (dynamic rating property ids)
  // defeats Liveblocks' immutable-type inference for `useStorage`, which falls back to the
  // generic `ReadonlyJsonObject` for that field instead of our declared `ScoreSet` — the actual
  // runtime data is unaffected, this is purely a gap in their recursive type helper.
  return useStorage((root) => root.options, shallow) as readonly OptionData[]
}

export function useRatingProperties(): readonly RatingProperty[] {
  return useStorage((root) => root.ratingProperties, shallow)
}

export function useBoardDecision() {
  return useStorage((root) => root.decision, shallow)
}

export function useBoardTimer() {
  return useStorage((root) => root.timer, shallow)
}

export function useBoardSituationAgreed() {
  return useStorage((root) => root.situationAgreed)
}

/** Options ordered by total score, highest first; options without a score sort last. */
export function useRankedOptions(): readonly OptionData[] {
  // See the cast comment in `useBoardOptions` above — same Liveblocks type-inference gap.
  return useStorage((root) => {
    const options = root.options as readonly OptionData[]
    return [...options].sort((a, b) => {
      const totalA = totalScore(a.scores, root.ratingProperties)
      const totalB = totalScore(b.scores, root.ratingProperties)
      if (totalA === null && totalB === null) return 0
      if (totalA === null) return 1
      if (totalB === null) return -1
      return totalB - totalA
    })
  }, shallow)
}
