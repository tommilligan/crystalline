export type Phase = 'situation' | 'ideation' | 'evaluation' | 'decision'

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
    subtitle: 'Is this a good option, and how does it score?',
  },
  {
    key: 'decision',
    label: 'Decision',
    number: 4,
    subtitle: 'Which option are we going to take forward?',
  },
]

/** The phase after `phase` in the fixed phase order, or `null` for `decision` (the last one) —
 * what a column's "Next >" button advances to. */
export function nextPhase(phase: Phase): Phase | null {
  const index = PHASES.findIndex((candidate) => candidate.key === phase)
  return PHASES[index + 1]?.key ?? null
}

export type LifecycleState = 'active' | 'signed'

/** A numeric rating property every option is scored against, 1 (bad) to 5 (good) — shared board
 * configuration (see `Storage.ratingProperties` in `liveblocks.config.ts`), not fixed dimensions:
 * teams can rename, add, or remove properties to fit what they're actually deciding between.
 * `id` is stable once created (used as the key into a `ScoreSet`) even if `label` is later
 * edited. */
export type RatingProperty = {
  id: string
  label: string
}

/** Seeds a fresh board with the same six properties the tool originally shipped with — a
 * reasonable starting point that every team can freely edit or replace via the Evaluation
 * column's properties picker. */
export const DEFAULT_RATING_PROPERTIES: ReadonlyArray<RatingProperty> = [
  { id: 'people', label: 'People' },
  { id: 'time', label: 'Time' },
  { id: 'money', label: 'Money' },
  { id: 'quality', label: 'Quality' },
  { id: 'service', label: 'Service' },
  { id: 'price', label: 'Price' },
]

/** Each property is scored independently, keyed by `RatingProperty.id` — a property with no
 * entry is simply unscored, not defaulted to some "neutral" number, so a single click never
 * silently sets every other property at once. A score can outlive its property (e.g. after the
 * property is removed from the board); `totalScore` ignores anything that isn't in the current
 * property list, so stale entries are harmless and never need cleaning up. */
export type ScoreSet = Partial<Record<string, number>>

export function emptyScoreSet(): ScoreSet {
  return {}
}

/** Null once no property has been scored yet; otherwise the sum of whichever of the current
 * `properties` have been scored so far (unscored properties, and any score left over from a
 * since-removed property, don't count towards it). */
export function totalScore(
  scores: ScoreSet | null,
  properties: readonly RatingProperty[],
): number | null {
  if (!scores) return null
  const scored = properties
    .map((property) => scores[property.id])
    .filter((value): value is number => value !== undefined)
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

/** How the team reached the chosen decision — drives whether the dissent field is shown (only
 * once a non-'all' agreement is recorded) in both the live board and the export. */
export type Agreement = 'all' | 'majority' | 'minority' | 'unilateral'

/** Ordered so each `label` reads naturally as the tail of "This decision was agreed to …". */
export const AGREEMENT_OPTIONS: ReadonlyArray<{ value: Agreement; label: string }> = [
  { value: 'all', label: 'by all' },
  { value: 'majority', label: 'by a majority' },
  { value: 'minority', label: 'by a minority' },
  { value: 'unilateral', label: 'unilaterally' },
]

/** Non-text fields for the Decision. `countermeasure` and `dissent` are Yjs text fragments. */
export type DecisionData = {
  chosenOptionId: string | null
  approvedBy: string | null
  date: string | null
  agreement: Agreement | null
}

/** A single row of the Next Steps plan, recorded once the decision itself is signed. A plain
 * object type (not an interface) so it structurally satisfies Liveblocks' `LsonObject`
 * constraint when used as `LiveObject<NextStepData>` — see `OptionData`'s doc comment. */
export type NextStepData = {
  id: string
  action: string
  owner: string
  dueDate: string | null
}

export interface BoardSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

/** Spreadsheet-style display label for an option's position in the canonical (creation) order —
 * A, B, ..., Z, AA, AB, ... — shown anywhere an option's name appears read-only (accordion
 * headers, ranking, export). Display only: never used as a storage key, and always derived from
 * an option's index in the canonical `options` list (not a ranked/sorted view of it), so the same
 * option keeps the same letter no matter where or in what order it's rendered. */
export function optionDisplayId(index: number): string {
  let n = index + 1
  let result = ''
  while (n > 0) {
    const remainder = (n - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    n = Math.floor((n - 1) / 26)
  }
  return result
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
