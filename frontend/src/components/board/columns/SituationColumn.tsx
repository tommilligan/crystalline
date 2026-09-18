import { Blockquote, SegmentedControl, Stack, Text } from '@mantine/core'
import { useEffect, useRef } from 'react'
import { useSetSituationAgreed } from '../../../hooks/useBoardMutations'
import { useBoardSituationAgreed } from '../../../hooks/useBoardState'
import { useFragmentPlainText } from '../../../liveblocks-yjs/useFragmentPlainText'
import { useYjsSynced } from '../../../liveblocks-yjs/YjsRoomProvider'
import { SITUATION_FIELD } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { NextButton } from '../NextButton'

interface SituationColumnProps {
  disabled?: boolean
  active?: boolean
  onAdvancePhase?: () => void
}

/**
 * The problem statement, gated behind a team-consensus toggle before the phase can advance
 * (`docs/phases.md`): agreement resets to "No" the moment the statement's text changes, since
 * it was agreement on that specific wording.
 *
 * Once this column isn't the active one, it doesn't dim like the others (see the situation
 * special-case in `BoardColumnShell`) — instead the editable field itself transforms into a
 * yellow blockquote read-out of the agreed statement, since the team has moved on from
 * editing it. Selecting the column again reverses this back to the edit view.
 */
export function SituationColumn({ disabled, active, onAdvancePhase }: SituationColumnProps) {
  const agreed = useBoardSituationAgreed()
  const setSituationAgreed = useSetSituationAgreed()
  const situationText = useFragmentPlainText(SITUATION_FIELD)
  const synced = useYjsSynced()
  const previousTextRef = useRef(situationText)
  const wasSyncedRef = useRef(false)

  useEffect(() => {
    // While the Yjs doc isn't synced, its fragment can read as stale or empty (initial load, or
    // a brief drop mid-resync) — don't trust a diff against it either way.
    if (!synced) {
      wasSyncedRef.current = false
      return
    }
    // The first render after (re)gaining sync is the persisted/reconciled text arriving, not an
    // edit — catch the ref up without resetting agreement, so a reload (or a brief reconnect)
    // doesn't look like someone changed the wording out from under an already-agreed statement.
    const justResynced = !wasSyncedRef.current
    wasSyncedRef.current = true
    if (justResynced) {
      previousTextRef.current = situationText
      return
    }
    if (previousTextRef.current !== situationText) {
      previousTextRef.current = situationText
      if (agreed) setSituationAgreed(false)
    }
  }, [situationText, agreed, setSituationAgreed, synced])

  if (!active) {
    return (
      <Blockquote color="yellow">
        <Text size="xl" fw={700}>
          {situationText || 'No problem statement yet.'}
        </Text>
      </Blockquote>
    )
  }

  return (
    <Stack gap="sm">
      <Text size="xs" fw={500} c="dimmed">
        Problem statement. Try to keep it to one or two sentences.
      </Text>
      <CollaborativeTextField
        field={SITUATION_FIELD}
        placeholder="Describe the problem. Aim for team consensus before moving on — this phase is usually time-boxed to 15–20 minutes."
        disabled={disabled}
        minRows={4}
      />
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Does everyone agree with this problem statement?
        </Text>
        <SegmentedControl
          size="xs"
          disabled={disabled}
          data={[
            { label: 'No', value: 'no' },
            { label: 'Yes', value: 'yes' },
          ]}
          value={agreed ? 'yes' : 'no'}
          onChange={(value) => setSituationAgreed(value === 'yes')}
          style={{ alignSelf: 'flex-start' }}
        />
      </Stack>
      {onAdvancePhase && <NextButton onClick={onAdvancePhase} disabled={!agreed} />}
    </Stack>
  )
}
