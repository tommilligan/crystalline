import type { OptionData } from '../types/board'
import { useResumableSelection } from './useResumableSelection'

/**
 * Drives the "walk through each option, one at a time" flow shared by the Evaluation and
 * Scoring columns — the per-option analogue of the phase "Go to next step" flow in
 * `BoardLayout`. Which option is active is per-viewer UI state, not board data (see the
 * `Storage` comment in `liveblocks.config.ts`), so it lives in local state here rather than
 * syncing between participants. See `useResumableSelection` for the resume/freeze behavior.
 */
export function useOptionWalkthrough(
  options: readonly OptionData[],
  hasOptionData?: readonly boolean[],
) {
  const { active, next, focus } = useResumableSelection(
    options,
    (option) => option.id,
    hasOptionData ?? [],
  )

  return {
    activeOption: active,
    nextOption: next,
    focus,
  }
}
