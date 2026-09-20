import { useCallback } from 'react'
import type * as Y from 'yjs'
import { useBoardDoc } from '../board-doc/BoardDocContext'
import {
  createNextStepMap,
  createOptionMap,
  createRatingPropertyMap,
  findById,
  findIndexById,
  getDecisionMap,
  getMetaMap,
  getNextStepsArray,
  getOptionsArray,
  getRatingPropertiesArray,
} from '../lib/boardDoc'
import { seedTextFragment } from '../liveblocks-yjs/seedTextFragment'
import type { Agreement, NextStepData } from '../types/board'

/**
 * These mutations mirror the event types in `docs/event-schema.md` (idea_added,
 * evaluation_updated, score_set, decision_recorded, board_signed, phase_changed, ...) but apply
 * directly to the shared `Y.Doc` instead of Liveblocks Storage: the Yjs/IndexedDB backends now
 * provide what Liveblocks Storage used to provide for single-device MVP and multiplayer scenarios
 * alike (see `docs/local-first-mode-plan.md`).
 */

export function useSetTitle() {
  const { doc } = useBoardDoc()
  return useCallback(
    (title: string) => {
      getMetaMap(doc).set('title', title)
    },
    [doc],
  )
}

export function useSetSituationAgreed() {
  const { doc } = useBoardDoc()
  return useCallback(
    (agreed: boolean) => {
      getMetaMap(doc).set('situationAgreed', agreed)
    },
    [doc],
  )
}

/** Creates a new option with an optional initial idea text. Returns the new option's id. */
export function useAddIdea() {
  const { doc } = useBoardDoc()
  return useCallback(
    (text?: string): string => {
      const id = crypto.randomUUID()
      doc.transact(() => {
        const option = createOptionMap(id, Date.now())
        getOptionsArray(doc).push([option])
        if (text?.trim()) {
          const ideaFragment = option.get('idea') as Y.XmlFragment
          seedTextFragment(ideaFragment, text)
        }
      })
      return id
    },
    [doc],
  )
}

export function useRemoveIdea() {
  const { doc } = useBoardDoc()
  return useCallback(
    (optionId: string) => {
      const options = getOptionsArray(doc)
      const index = findIndexById(options, optionId)
      if (index !== -1) {
        options.delete(index)
      }
    },
    [doc],
  )
}

export function useSetScore() {
  const { doc } = useBoardDoc()
  return useCallback(
    (optionId: string, propertyId: string, value: number) => {
      const option = findById(getOptionsArray(doc), optionId)
      if (!option) return
      const scores = option.get('scores') as Y.Map<number>
      scores.set(propertyId, value)
    },
    [doc],
  )
}

/** Adds a new rating property to the end of the board's shared property list — see
 * `RatingPropertiesPicker`. */
export function useAddRatingProperty() {
  const { doc } = useBoardDoc()
  return useCallback(
    (label: string): string => {
      const id = crypto.randomUUID()
      doc.transact(() => {
        const property = createRatingPropertyMap(id, label)
        getRatingPropertiesArray(doc).push([property])
      })
      return id
    },
    [doc],
  )
}

/** Removes a rating property. Any scores already recorded against it are left in place on each
 * option (see `ScoreSet`'s doc comment) — they simply stop counting once the property is gone. */
export function useRemoveRatingProperty() {
  const { doc } = useBoardDoc()
  return useCallback(
    (propertyId: string) => {
      const properties = getRatingPropertiesArray(doc)
      const index = findIndexById(properties, propertyId)
      if (index !== -1) {
        properties.delete(index)
      }
    },
    [doc],
  )
}

export function useSetChosenOption() {
  const { doc } = useBoardDoc()
  return useCallback(
    (optionId: string | null) => {
      getDecisionMap(doc).set('chosenOptionId', optionId)
    },
    [doc],
  )
}

export function useSetApprovedBy() {
  const { doc } = useBoardDoc()
  return useCallback(
    (approvedBy: string) => {
      getDecisionMap(doc).set('approvedBy', approvedBy)
    },
    [doc],
  )
}

export function useSetAgreement() {
  const { doc } = useBoardDoc()
  return useCallback(
    (agreement: Agreement | null) => {
      getDecisionMap(doc).set('agreement', agreement)
    },
    [doc],
  )
}

/** Appends a new Next Steps row with optional initial action text — used by both the "Add action +"
 * button and, once, to seed the table's always-present first row (see `DecisionColumn`). */
export function useAddNextStep() {
  const { doc } = useBoardDoc()
  return useCallback(
    (action: string = ''): string => {
      const id = crypto.randomUUID()
      doc.transact(() => {
        const row = createNextStepMap(id, action)
        getNextStepsArray(doc).push([row])
      })
      return id
    },
    [doc],
  )
}

/** Seeds the Next Steps table's first row, but only if it's still actually empty *at the moment
 * this mutation runs* — checking live storage here, not the `nextSteps` value React last
 * rendered with, is what makes this safe to call from an effect: two near-simultaneous calls
 * (e.g. React's dev-mode double effect invocation, or two participants opening Decision at
 * once) each see the other's write once the backend applies it, so at most one row gets added. */
export function useEnsureFirstNextStep() {
  const { doc } = useBoardDoc()
  return useCallback(() => {
    const nextSteps = getNextStepsArray(doc)
    if (nextSteps.length === 0) {
      const id = crypto.randomUUID()
      const row = createNextStepMap(id)
      nextSteps.push([row])
    }
  }, [doc])
}

export function useUpdateNextStep() {
  const { doc } = useBoardDoc()
  return useCallback(
    (nextStepId: string, patch: Partial<Omit<NextStepData, 'id'>>) => {
      const nextStep = findById(getNextStepsArray(doc), nextStepId)
      if (!nextStep) return
      doc.transact(() => {
        Object.entries(patch).forEach(([key, value]) => {
          nextStep.set(key, value)
        })
      })
    },
    [doc],
  )
}

export function useRemoveNextStep() {
  const { doc } = useBoardDoc()
  return useCallback(
    (nextStepId: string) => {
      const nextSteps = getNextStepsArray(doc)
      const index = findIndexById(nextSteps, nextStepId)
      if (index !== -1) {
        nextSteps.delete(index)
      }
    },
    [doc],
  )
}

/** Locks the Next Steps plan — irreversible in MVP, mirroring `useSignBoard` below, but tracked
 * independently so committing the plan doesn't require re-signing the decision itself. */
export function useCommitNextSteps() {
  const { doc } = useBoardDoc()
  return useCallback(() => {
    doc.transact(() => {
      const meta = getMetaMap(doc)
      meta.set('nextStepsCommitted', true)
      meta.set('nextStepsCommittedAt', new Date().toISOString())
    })
  }, [doc])
}

export function useSignBoard() {
  const { doc } = useBoardDoc()
  return useCallback(() => {
    doc.transact(() => {
      const meta = getMetaMap(doc)
      meta.set('lifecycleState', 'signed')
      meta.set('signedAt', new Date().toISOString())
      const decision = getDecisionMap(doc)
      if (!decision.get('date')) {
        decision.set('date', new Date().toISOString().slice(0, 10))
      }
    })
  }, [doc])
}

/** Dev-only escape hatch: sign-off is otherwise irreversible in MVP (see `docs/mvp-scope.md`),
 * but reverting in place lets us reuse the same room for repeated manual testing instead of
 * spinning up a fresh one every time. Never expose this outside `import.meta.env.DEV`.
 *
 * Also reverts a committed Next Steps plan, if any — otherwise the board would come back
 * unsigned but with Next Steps still locked, which the normal flow can never produce (committing
 * is tracked independently of signing, but only reachable *after* signing). */
export function useUnsignBoard() {
  const { doc } = useBoardDoc()
  return useCallback(() => {
    doc.transact(() => {
      const meta = getMetaMap(doc)
      meta.set('lifecycleState', 'active')
      meta.set('signedAt', null)
      if (meta.get('nextStepsCommitted')) {
        meta.set('nextStepsCommitted', false)
        meta.set('nextStepsCommittedAt', null)
      }
    })
  }, [doc])
}
