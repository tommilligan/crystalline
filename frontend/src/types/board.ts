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
    subtitle: 'The Problem',
  },
  {
    key: 'ideation',
    label: 'Options',
    number: 2,
    subtitle: 'Rapid-Fire Ideas',
  },
  {
    key: 'evaluation',
    label: 'Evaluation',
    number: 3,
    subtitle: 'Pros & Cons Review',
  },
  {
    key: 'scoring',
    label: 'Costs/Benefits',
    number: 4,
    subtitle: 'Numerical Trade-offs',
  },
  {
    key: 'decision',
    label: 'Decision',
    number: 5,
    subtitle: 'Implementation',
  },
]

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

export type ScoreSet = Record<ScoreDimension, number>

export const DEFAULT_SCORE_VALUE = 3

export function emptyScoreSet(): ScoreSet {
  return {
    people: DEFAULT_SCORE_VALUE,
    time: DEFAULT_SCORE_VALUE,
    money: DEFAULT_SCORE_VALUE,
    quality: DEFAULT_SCORE_VALUE,
    service: DEFAULT_SCORE_VALUE,
    price: DEFAULT_SCORE_VALUE,
  }
}

export function totalScore(scores: ScoreSet | null): number | null {
  if (!scores) return null
  return SCORE_DIMENSIONS.reduce((sum, dimension) => sum + scores[dimension.key], 0)
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
}

export interface BoardSummary {
  id: string
  title: string
  createdAt: number
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
