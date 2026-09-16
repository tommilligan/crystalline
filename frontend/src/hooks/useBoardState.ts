import { shallow } from '@liveblocks/react'
import { useStorage } from '../liveblocks.config'
import type { OptionData } from '../types/board'
import { totalScore } from '../types/board'

export function useBoardTitle() {
  return useStorage((root) => root.title)
}

export function useBoardPhase() {
  return useStorage((root) => root.currentPhase)
}

export function useBoardLifecycle() {
  return useStorage((root) => ({ state: root.lifecycleState, signedAt: root.signedAt }), shallow)
}

export function useBoardOptions(): readonly OptionData[] {
  return useStorage((root) => root.options, shallow)
}

export function useBoardDecision() {
  return useStorage((root) => root.decision, shallow)
}

export function useBoardTimer() {
  return useStorage((root) => root.timer, shallow)
}

/** Options ordered by total score, highest first; options without a score sort last. */
export function useRankedOptions(): readonly OptionData[] {
  return useStorage(
    (root) =>
      [...root.options].sort((a, b) => {
        const totalA = totalScore(a.scores)
        const totalB = totalScore(b.scores)
        if (totalA === null && totalB === null) return 0
        if (totalA === null) return 1
        if (totalB === null) return -1
        return totalB - totalA
      }),
    shallow,
  )
}
