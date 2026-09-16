import { LiveObject } from '@liveblocks/client'
import { useMutation } from '../liveblocks.config'
import type { ScoreDimension, ScoreSet } from '../types/board'

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
  return useMutation(({ storage }, optionId: string, dimension: ScoreDimension, value: number) => {
    const option = storage.get('options').find((item) => item.get('id') === optionId)
    if (!option) return
    const current: ScoreSet = option.get('scores') ?? {}
    option.set('scores', { ...current, [dimension]: value })
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

export function useSetNextStep() {
  return useMutation(({ storage }, nextStep: string) => {
    storage.get('decision').set('nextStep', nextStep)
  }, [])
}

export function useSetOwner() {
  return useMutation(({ storage }, owner: string) => {
    storage.get('decision').set('owner', owner)
  }, [])
}

export function useSetDeadline() {
  return useMutation(({ storage }, deadline: string | null) => {
    storage.get('decision').set('deadline', deadline)
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
 * spinning up a fresh one every time. Never expose this outside `import.meta.env.DEV`. */
export function useUnsignBoard() {
  return useMutation(({ storage }) => {
    storage.set('lifecycleState', 'active')
    storage.set('signedAt', null)
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
