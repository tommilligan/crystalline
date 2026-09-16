import { LiveObject } from '@liveblocks/client'
import { useMutation } from '../liveblocks.config'
import type { Phase } from '../types/board'
import { emptyScoreSet, type ScoreDimension, type ScoreSet } from '../types/board'

/**
 * These mutations mirror the event types in `docs/event-schema.md` (idea_added,
 * evaluation_updated, score_set, decision_recorded, board_signed, phase_changed, ...) but apply
 * directly to Liveblocks Storage instead of an append-only local log: Liveblocks' own storage
 * history/undo and multiplayer conflict resolution now provide what the local event log was
 * designed to provide for a single-device MVP.
 */

export function useSetPhase() {
  return useMutation(({ storage }, phase: Phase) => {
    storage.set('currentPhase', phase)
  }, [])
}

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
    const current: ScoreSet = option.get('scores') ?? emptyScoreSet()
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

export function useSetDecisionDate() {
  return useMutation(({ storage }, date: string | null) => {
    storage.get('decision').set('date', date)
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
