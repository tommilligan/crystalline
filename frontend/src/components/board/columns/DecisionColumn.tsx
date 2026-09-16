import { Badge, Button, Card, Group, Stack, Text, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useDisclosure } from '@mantine/hooks'
import {
  useSetApprovedBy,
  useSetChosenOption,
  useSetDecisionDate,
  useSignBoard,
} from '../../../hooks/useBoardMutations'
import type { DecisionData, OptionData } from '../../../types/board'
import { COUNTERMEASURE_FIELD, DISSENT_FIELD, optionTextField } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { SignBoardModal } from '../SignBoardModal'

interface DecisionColumnProps {
  options: readonly OptionData[]
  decision: DecisionData
  signed: boolean
  disabled?: boolean
}

/** Records the chosen option, its countermeasure, any dissent, and drives the (irreversible in
 * MVP) sign-off action. See `docs/mvp-scope.md`: there is no "unsign" — Clone is the intended
 * flow for further changes after sign-off. */
export function DecisionColumn({ options, decision, signed, disabled }: DecisionColumnProps) {
  const setChosenOption = useSetChosenOption()
  const setApprovedBy = useSetApprovedBy()
  const setDecisionDate = useSetDecisionDate()
  const signBoard = useSignBoard()
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)

  const canSign =
    !signed && Boolean(decision.chosenOptionId) && Boolean(decision.approvedBy?.trim())

  return (
    <>
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Chosen option
        </Text>
        {options.length === 0 && (
          <Text size="sm" c="dimmed">
            Add some options first, or jump in anyway.
          </Text>
        )}
        {options.map((option) => {
          const isChosen = decision.chosenOptionId === option.id
          return (
            <Card
              key={option.id}
              withBorder
              padding="xs"
              onClick={() => !disabled && setChosenOption(isChosen ? null : option.id)}
              style={{
                cursor: disabled ? 'default' : 'pointer',
                borderColor: isChosen ? 'var(--mantine-color-teal-6)' : undefined,
                borderWidth: isChosen ? 2 : 1,
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <div style={{ flex: 1 }}>
                  <CollaborativeTextField field={optionTextField(option.id)} disabled />
                </div>
                {isChosen && <Badge color="teal">Chosen</Badge>}
              </Group>
            </Card>
          )
        })}
      </Stack>

      <CollaborativeTextField
        field={COUNTERMEASURE_FIELD}
        label="Countermeasure"
        placeholder="Notes on how to overcome the chosen option's blocker…"
        disabled={disabled}
      />

      <CollaborativeTextField
        field={DISSENT_FIELD}
        label="Dissent"
        placeholder="Note any objections, even after a decision has been drafted…"
        disabled={disabled}
      />

      <TextInput
        label="Approved by"
        placeholder="Name of the approver"
        value={decision.approvedBy ?? ''}
        disabled={disabled}
        onChange={(event) => setApprovedBy(event.currentTarget.value)}
      />

      <DateInput
        label="Date"
        placeholder="Pick a date"
        value={decision.date}
        disabled={disabled}
        onChange={(value) => setDecisionDate(value)}
      />

      {signed ? (
        <Badge color="gray" variant="light">
          Signed — board is read-only
        </Badge>
      ) : (
        <Button onClick={openModal} disabled={!canSign} color="teal">
          Sign board
        </Button>
      )}

      <SignBoardModal
        opened={modalOpened}
        onClose={closeModal}
        onConfirm={() => {
          signBoard()
          closeModal()
        }}
      />
    </>
  )
}
