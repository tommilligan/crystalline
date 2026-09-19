import { Blockquote, SegmentedControl, Stack, Text } from '@mantine/core'
import { useEffect, useId, useRef } from 'react'
import { useBoardSynced } from '../../../board-doc/BoardDocContext'
import { useSetSituationAgreed } from '../../../hooks/useBoardMutations'
import { useBoardSituationAgreed, useSituationFragment } from '../../../hooks/useBoardState'
import { useFragmentPlainText } from '../../../liveblocks-yjs/useFragmentPlainText'
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
  const situationFragment = useSituationFragment()
  const situationText = useFragmentPlainText(situationFragment)
  const synced = useBoardSynced()
  const previousTextRef = useRef(situationText)
  const wasSyncedRef = useRef(false)
  const agreeLabelId = useId()

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
      <CollaborativeTextField
        fragment={situationFragment}
        placeholder="Describe the problem"
        disabled={disabled}
        ariaLabel="Problem statement"
      />
      <Stack gap={4}>
        <Text id={agreeLabelId} size="sm" fw={500}>
          Does everyone agree with this problem statement?
        </Text>
        <SegmentedControl
          size="xs"
          disabled={disabled}
          aria-labelledby={agreeLabelId}
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
