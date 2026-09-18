import type * as Y from 'yjs'
import { z } from 'zod'

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

/** `phase`'s position in the fixed phase order, 1-indexed to match `PHASES[].number`. */
export function phaseNumber(phase: Phase): number {
  return PHASES.find((candidate) => candidate.key === phase)?.number ?? 1
}

export const LifecycleStateSchema = z.enum(['active', 'signed'])
export type LifecycleState = z.infer<typeof LifecycleStateSchema>

/** A numeric rating property every option is scored against, 1 (bad) to 5 (good) — shared board
 * configuration, not fixed dimensions: teams can rename, add, or remove properties to fit what
 * they're actually deciding between. `id` is stable once created (used as the key into a
 * `ScoreSet`) even if `label` is later edited. */
export const RatingPropertySchema = z.object({
  id: z.string(),
  label: z.string(),
})
export type RatingProperty = z.infer<typeof RatingPropertySchema>

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

/** Non-text, structured fields for an Option, as persisted in Yjs and validated by Zod at the
 * read-hook boundary. Text (idea/enabler/blocker) and scores live alongside these as sibling
 * values in the same `Y.Map` — see `lib/boardDoc.ts` — but aren't part of this schema since a
 * `Y.XmlFragment`/`Y.Map` is a live binding, not domain data with a shape to validate. */
export const OptionFieldsSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
})
export type OptionFields = z.infer<typeof OptionFieldsSchema>

/** The full reactive shape read hooks return for an option: validated plain fields, the live
 * `scores` map read out as a plain object, and the live text fragments themselves (for
 * `CollaborativeTextField`/plain-text reads) — see `useBoardOptions` in `hooks/useBoardState.ts`. */
export type OptionData = OptionFields & {
  scores: ScoreSet
  ideaFragment: Y.XmlFragment
  enablerFragment: Y.XmlFragment
  blockerFragment: Y.XmlFragment
}

/** How the team reached the chosen decision — drives whether the dissent field is shown (only
 * once a non-'all' agreement is recorded) in both the live board and the export. */
export const AgreementSchema = z.enum(['all', 'majority', 'minority', 'unilateral'])
export type Agreement = z.infer<typeof AgreementSchema>

/** Ordered so each `label` reads naturally as the tail of "This decision was agreed to …". */
export const AGREEMENT_OPTIONS: ReadonlyArray<{ value: Agreement; label: string }> = [
  { value: 'all', label: 'by all' },
  { value: 'majority', label: 'by a majority' },
  { value: 'minority', label: 'by a minority' },
  { value: 'unilateral', label: 'unilaterally' },
]

/** Non-text, structured fields for the Decision — `countermeasure`/`dissent` are Yjs text
 * fragments, added onto this by the read hook the same way `OptionData` extends
 * `OptionFields`. */
export const DecisionFieldsSchema = z.object({
  chosenOptionId: z.string().nullable(),
  approvedBy: z.string().nullable(),
  date: z.string().nullable(),
  agreement: AgreementSchema.nullable(),
})
export type DecisionFields = z.infer<typeof DecisionFieldsSchema>

export type DecisionData = DecisionFields & {
  countermeasureFragment: Y.XmlFragment
  dissentFragment: Y.XmlFragment
}

/** A single row of the Next Steps plan, recorded once the decision itself is signed. No text
 * fragments today — `action`/`owner` are plain inputs, not TipTap (see the plan doc for why a
 * future rich-text field here would nest the same way `OptionData`'s do). */
export const NextStepSchema = z.object({
  id: z.string(),
  action: z.string(),
  owner: z.string(),
  dueDate: z.string().nullable(),
})
export type NextStepData = z.infer<typeof NextStepSchema>

/** Whether a Next Steps row holds any real user input. The table always keeps at least one blank
 * row present (`useEnsureFirstNextStep`), so this is what distinguishes a touched row from that
 * seed row — used both to decide whether the Decision column counts as "has data" and to hide
 * untouched rows once the plan is committed. */
export function nextStepHasContent(step: NextStepData): boolean {
  return Boolean(step.action.trim() || step.owner.trim() || step.dueDate)
}

/** The board's non-text top-level fields, stored as sibling keys in the `meta` `Y.Map` alongside
 * the `situation` text fragment (see `lib/boardDoc.ts`). */
export const BoardMetaFieldsSchema = z.object({
  title: z.string(),
  lifecycleState: LifecycleStateSchema,
  signedAt: z.string().nullable(),
  nextStepsCommitted: z.boolean(),
  nextStepsCommittedAt: z.string().nullable(),
  situationAgreed: z.boolean(),
})
export type BoardMetaFields = z.infer<typeof BoardMetaFieldsSchema>

/** Which storage/transport backend a board uses — chosen once at creation (see
 * `docs/local-first-mode-plan.md`). Every mutation/read hook works identically in both; only the
 * provider underneath the shared `Y.Doc` differs. */
export const BoardModeSchema = z.enum(['local', 'shared'])
export type BoardMode = z.infer<typeof BoardModeSchema>

export interface BoardSummary {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  mode: BoardMode
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

export const TimerStatusSchema = z.enum(['idle', 'running', 'paused'])
export type TimerStatus = z.infer<typeof TimerStatusSchema>

/** Synced session-timer state (advisory time-box on the situation phase, `docs/ui-notes.md`).
 * The `Y.Doc` is the single source of truth: a running timer needs only `endsAt` (the epoch ms
 * it counts down to), so clients compute the displayed remaining time locally against their own
 * clock — ticking never causes a write, only start/pause/reset do. */
export const TimerStateSchema = z.object({
  status: TimerStatusSchema,
  durationMs: z.number(),
  remainingMs: z.number(),
  endsAt: z.number().nullable(),
})
export type TimerState = z.infer<typeof TimerStateSchema>

export const DEFAULT_TIMER_DURATION_MS = 15 * 60 * 1000
