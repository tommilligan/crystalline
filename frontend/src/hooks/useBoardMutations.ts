import { LiveObject } from '@liveblocks/client'
import { useMutation } from '../liveblocks.config'
import type { Agreement, NextStepData, ScoreSet } from '../types/board'

/**
 * These mutations mirror the event types in `docs/event-schema.md` (idea_added,
 * evaluation_updated, score_set, decision_recorded, board_signed, phase_changed, ...) but apply
 * directly to Liveblocks Storage instead of an append-only local log: Liveblocks' own storage
 * history/undo and multiplayer conflict resolution now provide what the local event log was
 * designed to provide for a single-device MVP.
 */

export function useSetTitle() {
  return useMutation(({ storage }, title: string) => {
    storage.set('title', title)
  }, [])
}

export function useSetSituationAgreed() {
  return useMutation(({ storage }, agreed: boolean) => {
    storage.set('situationAgreed', agreed)
  }, [])
}

export function useAddIdea() {
  return useMutation(({ storage }) => {
    const id = crypto.randomUUID()
    storage.get('options').push(new LiveObject({ id, createdAt: Date.now(), scores: null }))
    return id
  }, [])
}

export function useRemoveIdea() {
  return useMutation(({ storage }, optionId: string) => {
    const options = storage.get('options')
    const index = options.findIndex((option) => option.get('id') === optionId)
    if (index !== -1) {
      options.delete(index)
    }
  }, [])
}

export function useSetScore() {
  return useMutation(({ storage }, optionId: string, propertyId: string, value: number) => {
    const option = storage.get('options').find((item) => item.get('id') === optionId)
    if (!option) return
    const current: ScoreSet = option.get('scores') ?? {}
    option.set('scores', { ...current, [propertyId]: value })
  }, [])
}

/** Adds a new rating property to the end of the board's shared property list — see
 * `RatingPropertiesPicker`. */
export function useAddRatingProperty() {
  return useMutation(({ storage }, label: string) => {
    const id = crypto.randomUUID()
    storage.get('ratingProperties').push(new LiveObject({ id, label }))
    return id
  }, [])
}

/** Removes a rating property. Any scores already recorded against it are left in place on each
 * option (see `ScoreSet`'s doc comment) — they simply stop counting once the property is gone. */
export function useRemoveRatingProperty() {
  return useMutation(({ storage }, propertyId: string) => {
    const properties = storage.get('ratingProperties')
    const index = properties.findIndex((property) => property.get('id') === propertyId)
    if (index !== -1) {
      properties.delete(index)
    }
  }, [])
}

export function useSetChosenOption() {
  return useMutation(({ storage }, optionId: string | null) => {
    storage.get('decision').set('chosenOptionId', optionId)
  }, [])
}

export function useSetApprovedBy() {
  return useMutation(({ storage }, approvedBy: string) => {
    storage.get('decision').set('approvedBy', approvedBy)
  }, [])
}

export function useSetAgreement() {
  return useMutation(({ storage }, agreement: Agreement | null) => {
    storage.get('decision').set('agreement', agreement)
  }, [])
}

/** Appends a blank Next Steps row — used by both the "Add action +" button and, once, to seed
 * the table's always-present first row (see `DecisionColumn`). */
export function useAddNextStep() {
  return useMutation(({ storage }, action: string = '') => {
    const id = crypto.randomUUID()
    storage.get('nextSteps').push(new LiveObject({ id, action, owner: '', dueDate: null }))
    return id
  }, [])
}

/** Seeds the Next Steps table's first row, but only if it's still actually empty *at the moment
 * this mutation runs* — checking live storage here, not the `nextSteps` value React last
 * rendered with, is what makes this safe to call from an effect: two near-simultaneous calls
 * (e.g. React's dev-mode double effect invocation, or two participants opening Decision at
 * once) each see the other's write once Liveblocks applies it, so at most one row gets added. */
export function useEnsureFirstNextStep() {
  return useMutation(({ storage }) => {
    const nextSteps = storage.get('nextSteps')
    if (nextSteps.length === 0) {
      const id = crypto.randomUUID()
      nextSteps.push(new LiveObject({ id, action: '', owner: '', dueDate: null }))
    }
  }, [])
}

export function useUpdateNextStep() {
  return useMutation(
    ({ storage }, nextStepId: string, patch: Partial<Omit<NextStepData, 'id'>>) => {
      const nextStep = storage.get('nextSteps').find((item) => item.get('id') === nextStepId)
      nextStep?.update(patch)
    },
    [],
  )
}

export function useRemoveNextStep() {
  return useMutation(({ storage }, nextStepId: string) => {
    const nextSteps = storage.get('nextSteps')
    const index = nextSteps.findIndex((item) => item.get('id') === nextStepId)
    if (index !== -1) {
      nextSteps.delete(index)
    }
  }, [])
}

/** Locks the Next Steps plan — irreversible in MVP, mirroring `useSignBoard` below, but tracked
 * independently so committing the plan doesn't require re-signing the decision itself. */
export function useCommitNextSteps() {
  return useMutation(({ storage }) => {
    storage.set('nextStepsCommitted', true)
    storage.set('nextStepsCommittedAt', new Date().toISOString())
  }, [])
}

export function useSignBoard() {
  return useMutation(({ storage }) => {
    const decision = storage.get('decision')
    storage.set('lifecycleState', 'signed')
    storage.set('signedAt', new Date().toISOString())
    if (!decision.get('date')) {
      decision.set('date', new Date().toISOString().slice(0, 10))
    }
  }, [])
}

/** Dev-only escape hatch: sign-off is otherwise irreversible in MVP (see `docs/mvp-scope.md`),
 * but reverting in place lets us reuse the same room for repeated manual testing instead of
 * spinning up a fresh one every time. Never expose this outside `import.meta.env.DEV`.
 *
 * Also reverts a committed Next Steps plan, if any — otherwise the board would come back
 * unsigned but with Next Steps still locked, which the normal flow can never produce (committing
 * is tracked independently of signing, but only reachable *after* signing). */
export function useUnsignBoard() {
  return useMutation(({ storage }) => {
    storage.set('lifecycleState', 'active')
    storage.set('signedAt', null)
    if (storage.get('nextStepsCommitted')) {
      storage.set('nextStepsCommitted', false)
      storage.set('nextStepsCommittedAt', null)
    }
  }, [])
}

/** Starts (or resumes from pause) the session timer. Writes only `endsAt`/`status` — clients
 * derive the ticking display locally by comparing `endsAt` to their own clock, so this is the
 * only network write until the next start/pause/reset. */
export function useStartTimer() {
  return useMutation(({ storage }) => {
    const timer = storage.get('timer')
    if (timer.get('status') === 'running') return
    timer.set('endsAt', Date.now() + timer.get('remainingMs'))
    timer.set('status', 'running')
  }, [])
}

/** Pauses the session timer, snapshotting the remaining time at the moment of pause. */
export function usePauseTimer() {
  return useMutation(({ storage }) => {
    const timer = storage.get('timer')
    if (timer.get('status') !== 'running') return
    const endsAt = timer.get('endsAt')
    const remainingMs =
      endsAt === null ? timer.get('remainingMs') : Math.max(0, endsAt - Date.now())
    timer.set('remainingMs', remainingMs)
    timer.set('endsAt', null)
    timer.set('status', 'paused')
  }, [])
}

export function useResetTimer() {
  return useMutation(({ storage }) => {
    const timer = storage.get('timer')
    timer.set('status', 'idle')
    timer.set('remainingMs', timer.get('durationMs'))
    timer.set('endsAt', null)
  }, [])
}
