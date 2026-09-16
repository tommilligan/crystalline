export type Phase = 'situation' | 'ideation' | 'evaluation' | 'scoring' | 'decision'

export const PHASES: ReadonlyArray<{ key: Phase; label: string; column: string }> = [
  { key: 'situation', label: 'Situation', column: 'Situation' },
  { key: 'ideation', label: 'Ideation', column: 'Options' },
  { key: 'evaluation', label: 'Evaluation', column: 'Evaluation' },
  { key: 'scoring', label: 'Scoring', column: 'Costs / Benefits' },
  { key: 'decision', label: 'Decision', column: 'Decision' },
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

export const SITUATION_FIELD = 'situation'
export const COUNTERMEASURE_FIELD = 'decision-countermeasure'
export const DISSENT_FIELD = 'decision-dissent'
