import * as Y from 'yjs'
import type {
  BoardMetaFields,
  DecisionData,
  DecisionFields,
  NextStepData,
  OptionData,
  OptionFields,
  RatingProperty,
  ScoreSet,
} from '../types/board'
import {
  BoardMetaFieldsSchema,
  DEFAULT_RATING_PROPERTIES,
  DecisionFieldsSchema,
  NextStepSchema,
  OptionFieldsSchema,
  RatingPropertySchema,
} from '../types/board'

/**
 * The board's one `Y.Doc` shape — see "Full data model" in `docs/local-first-mode-plan.md`. This
 * is the single place that names top-level doc keys and builds/reads the `Y.Map`/`Y.Array`
 * records inside them; every mutation hook (`hooks/useBoardMutations.ts`) and read hook
 * (`hooks/useBoardState.ts`) goes through these functions rather than calling `doc.getMap`/
 * `doc.getArray` or constructing records ad hoc, so the shape only needs to be gotten right once.
 */

type AnyMap = Y.Map<unknown>
type AnyArray = Y.Array<AnyMap>

const DOC_KEYS = {
  meta: 'meta',
  options: 'options',
  ratingProperties: 'ratingProperties',
  decision: 'decision',
  nextSteps: 'nextSteps',
} as const

// --- Top-level shared-type accessors ---------------------------------------------------------
// `doc.getMap`/`doc.getArray` return the same singleton instance for a given name for the life
// of the doc, auto-vivifying an empty one on first access — safe to call on every render.

export function getMetaMap(doc: Y.Doc): AnyMap {
  return doc.getMap(DOC_KEYS.meta)
}
export function getOptionsArray(doc: Y.Doc): AnyArray {
  return doc.getArray(DOC_KEYS.options)
}
export function getRatingPropertiesArray(doc: Y.Doc): AnyArray {
  return doc.getArray(DOC_KEYS.ratingProperties)
}
export function getDecisionMap(doc: Y.Doc): AnyMap {
  return doc.getMap(DOC_KEYS.decision)
}
export function getNextStepsArray(doc: Y.Doc): AnyArray {
  return doc.getArray(DOC_KEYS.nextSteps)
}

// --- Record lookup helpers ---------------------------------------------------------------------

export function findById(array: AnyArray, id: string): AnyMap | undefined {
  return array.toArray().find((item) => item.get('id') === id)
}

export function findIndexById(array: AnyArray, id: string): number {
  return array.toArray().findIndex((item) => item.get('id') === id)
}

// --- Record construction (fragments/nested maps built inside the owning transaction) -----------

export function createOptionMap(id: string, createdAt: number): AnyMap {
  const map = new Y.Map<unknown>()
  map.set('id', id)
  map.set('createdAt', createdAt)
  map.set('scores', new Y.Map<number>())
  map.set('idea', new Y.XmlFragment())
  map.set('enabler', new Y.XmlFragment())
  map.set('blocker', new Y.XmlFragment())
  return map
}

export function createNextStepMap(id: string, action = ''): AnyMap {
  const map = new Y.Map<unknown>()
  map.set('id', id)
  map.set('action', action)
  map.set('owner', '')
  map.set('dueDate', null)
  return map
}

export function createRatingPropertyMap(id: string, label: string): AnyMap {
  const map = new Y.Map<unknown>()
  map.set('id', id)
  map.set('label', label)
  return map
}

/**
 * Populates a fresh `Y.Doc` with the board's full shape — the Yjs equivalent of the old
 * `initialStorage()`. **Idempotent**: a no-op if `meta.title` is already set, so it's safe to
 * call speculatively on every connect (sharable mode seeds lazily on first sync, since a room's
 * Yjs doc only exists once a provider connects to it — see `BoardDocProvider`) without ever
 * clobbering existing content.
 */
export function createBoardDoc(doc: Y.Doc, title = 'Untitled board'): void {
  const meta = getMetaMap(doc)
  if (meta.has('title')) return

  doc.transact(() => {
    meta.set('title', title)
    meta.set('lifecycleState', 'active')
    meta.set('signedAt', null)
    meta.set('nextStepsCommitted', false)
    meta.set('nextStepsCommittedAt', null)
    meta.set('situationAgreed', false)
    meta.set('situation', new Y.XmlFragment())

    const ratingProperties = getRatingPropertiesArray(doc)
    ratingProperties.push(
      DEFAULT_RATING_PROPERTIES.map((property) =>
        createRatingPropertyMap(property.id, property.label),
      ),
    )

    const decision = getDecisionMap(doc)
    decision.set('chosenOptionId', null)
    decision.set('approvedBy', null)
    decision.set('date', null)
    decision.set('agreement', null)
    decision.set('countermeasure', new Y.XmlFragment())
    decision.set('dissent', new Y.XmlFragment())

    // `options`/`nextSteps` start empty — `getOptionsArray`/`getNextStepsArray` auto-vivify them
    // as a side effect of being read, nothing further to do here.
    getOptionsArray(doc)
    getNextStepsArray(doc)
  })
}

// --- Read helpers: plain fields validated via Zod + live fragment/map refs attached ------------
// One function per record/collection, mirroring the doc's own per-collection granularity (see
// the plan doc's "Zod schemas as the typed domain layer") — a corrupted single record throws
// only when that specific record is read, not the whole board.

function readOptionFields(map: AnyMap): OptionFields {
  return OptionFieldsSchema.parse({ id: map.get('id'), createdAt: map.get('createdAt') })
}

function readOptionScores(map: AnyMap): ScoreSet {
  const scores = map.get('scores') as Y.Map<number>
  return Object.fromEntries(scores.entries())
}

export function readOption(map: AnyMap): OptionData {
  return {
    ...readOptionFields(map),
    scores: readOptionScores(map),
    ideaFragment: map.get('idea') as Y.XmlFragment,
    enablerFragment: map.get('enabler') as Y.XmlFragment,
    blockerFragment: map.get('blocker') as Y.XmlFragment,
  }
}

export function readRatingProperty(map: AnyMap): RatingProperty {
  return RatingPropertySchema.parse({ id: map.get('id'), label: map.get('label') })
}

export function readNextStep(map: AnyMap): NextStepData {
  return NextStepSchema.parse({
    id: map.get('id'),
    action: map.get('action'),
    owner: map.get('owner'),
    dueDate: map.get('dueDate'),
  })
}

function readDecisionFields(map: AnyMap): DecisionFields {
  return DecisionFieldsSchema.parse({
    chosenOptionId: map.get('chosenOptionId'),
    approvedBy: map.get('approvedBy'),
    date: map.get('date'),
    agreement: map.get('agreement'),
  })
}

export function readDecision(map: AnyMap): DecisionData {
  return {
    ...readDecisionFields(map),
    countermeasureFragment: map.get('countermeasure') as Y.XmlFragment,
    dissentFragment: map.get('dissent') as Y.XmlFragment,
  }
}

export function readMeta(map: AnyMap): BoardMetaFields {
  return BoardMetaFieldsSchema.parse({
    title: map.get('title'),
    lifecycleState: map.get('lifecycleState'),
    signedAt: map.get('signedAt'),
    nextStepsCommitted: map.get('nextStepsCommitted'),
    nextStepsCommittedAt: map.get('nextStepsCommittedAt'),
    situationAgreed: map.get('situationAgreed'),
  })
}

export function getSituationFragment(doc: Y.Doc): Y.XmlFragment {
  return getMetaMap(doc).get('situation') as Y.XmlFragment
}
