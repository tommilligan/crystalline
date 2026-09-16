export type Phase = 'situation' | 'ideation' | 'evaluation' | 'scoring' | 'decision'

export const PHASES: ReadonlyArray<{
  key: Phase
  label: string
  number: number
  subtitle: string
}> = [
    {
      key: 'situation',
      label: 'Situation',
      number: 1,
      subtitle: 'What is the problem?',
    },
    {
      key: 'ideation',
      label: 'Options',
      number: 2,
      subtitle: 'How can we fix this?',
    },
    {
      key: 'evaluation',
      label: 'Evaluation',
      number: 3,
      subtitle: 'Is this a good option?',
    },
    {
      key: 'scoring',
      label: 'Costs/Benefits',
      number: 4,
      subtitle: 'What are the key properties?',
    },
    {
      key: 'decision',
      label: 'Decision',
      number: 5,
      subtitle: 'Which option are we going to take forward?',
    },
  ]

/** The phase after `phase` in the fixed five-phase order, or `null` for `decision` (the last
 * one) — what a column's "Next >" button advances to. */
export function nextPhase(phase: Phase): Phase | null {
  const index = PHASES.findIndex((candidate) => candidate.key === phase)
  return PHASES[index + 1]?.key ?? null
}

export type LifecycleState = 'active' | 'signed'

export const SCORE_DIMENSIONS = [
  { key: 'people', label: 'People' },
  { key: 'time', label: 'Time' },
  { key: 'money', label: 'Money' },
  { key: 'quality', label: 'Quality' },
  { key: 'service', label: 'Service' },
  { key: 'price', label: 'Price' },
] as const

export type ScoreDimension = (typeof SCORE_DIMENSIONS)[number]['key']

/** Each dimension is scored independently — a dimension with no entry is simply unscored,
 * not defaulted to some "neutral" number, so a single click never silently sets every other
 * dimension at once. */
export type ScoreSet = Partial<Record<ScoreDimension, number>>

export function emptyScoreSet(): ScoreSet {
  return {}
}

/** Null once no dimension has been scored yet; otherwise the sum of whichever dimensions have
 * been scored so far (unscored dimensions don't count towards it). */
export function totalScore(scores: ScoreSet | null): number | null {
  if (!scores) return null
  const scored = SCORE_DIMENSIONS.map((dimension) => scores[dimension.key]).filter(
    (value): value is number => value !== undefined,
  )
  if (scored.length === 0) return null
  return scored.reduce((sum, value) => sum + value, 0)
}

/** Non-text, structured fields for an Option. Text fields (idea, enabler, blocker) live in
 * the shared Yjs document as collaboratively-edited fragments, keyed by the option id.
 * A plain object type (not an interface) so it structurally satisfies Liveblocks' `LsonObject`
 * constraint when used as `LiveObject<OptionData>`. */
export type OptionData = {
  id: string
  createdAt: number
  scores: ScoreSet | null
}

/** Non-text fields for the Decision. `countermeasure` and `dissent` are Yjs text fragments. */
export type DecisionData = {
  chosenOptionId: string | null
  approvedBy: string | null
  date: string | null
  nextStep: string | null
  owner: string | null
  deadline: string | null
}

export interface BoardSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export function optionTextField(optionId: string): string {
  return `option-text-${optionId}`
}

export function optionEnablerField(optionId: string): string {
  return `option-enabler-${optionId}`
}

export function optionBlockerField(optionId: string): string {
  return `option-blocker-${optionId}`
}

export type TimerStatus = 'idle' | 'running' | 'paused'

/** Synced session-timer state (advisory time-box on the situation phase, `docs/ui-notes.md`).
 * Liveblocks Storage is the single source of truth: a running timer needs only `endsAt` (the
 * epoch ms it counts down to), so clients compute the displayed remaining time locally against
 * their own clock — ticking never causes a network write, only start/pause/reset do. */
export type TimerState = {
  status: TimerStatus
  durationMs: number
  remainingMs: number
  endsAt: number | null
}

export const DEFAULT_TIMER_DURATION_MS = 15 * 60 * 1000

export const SITUATION_FIELD = 'situation'
export const COUNTERMEASURE_FIELD = 'decision-countermeasure'
export const DISSENT_FIELD = 'decision-dissent'
