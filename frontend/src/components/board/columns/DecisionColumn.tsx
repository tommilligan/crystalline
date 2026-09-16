import { Badge, Button, Card, Group, Stack, Text, TextInput } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconLock } from '@tabler/icons-react'
import dayjs from 'dayjs'
import {
  useSetApprovedBy,
  useSetChosenOption,
  useSignBoard,
} from '../../../hooks/useBoardMutations'
import type { DecisionData, OptionData } from '../../../types/board'
import { COUNTERMEASURE_FIELD, DISSENT_FIELD, optionTextField } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { LiveClock } from '../LiveClock'
import { SignBoardModal } from '../SignBoardModal'

interface DecisionColumnProps {
  options: readonly OptionData[]
  decision: DecisionData
  signed: boolean
  signedAt: string | null
  disabled?: boolean
}

/** Records the chosen option, its countermeasure, any dissent, and drives the (irreversible in
 * MVP) sign-off action. See `docs/mvp-scope.md`: there is no "unsign" — Clone is the intended
 * flow for further changes after sign-off. */
export function DecisionColumn({
  options,
  decision,
  signed,
  signedAt,
  disabled,
}: DecisionColumnProps) {
  const setChosenOption = useSetChosenOption()
  const setApprovedBy = useSetApprovedBy()
  const signBoard = useSignBoard()
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false)

  const canSign =
    !signed && Boolean(decision.chosenOptionId) && Boolean(decision.approvedBy?.trim())

  return (
    <>
      <Stack gap={4}>
        <Text size="xs" fw={700} c="dimmed">
          SELECT OPTION
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
              padding={6}
              radius="sm"
              onClick={() => !disabled && setChosenOption(isChosen ? null : option.id)}
              style={{
                cursor: disabled ? 'default' : 'pointer',
                borderColor: isChosen ? 'var(--mantine-color-green-6)' : undefined,
                borderWidth: isChosen ? 2 : 1,
                background: isChosen ? 'var(--mantine-color-green-0)' : undefined,
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <CollaborativeTextField field={optionTextField(option.id)} disabled />
                </div>
                {isChosen && (
                  <Badge color="green" style={{ flexShrink: 0 }}>
                    Selected
                  </Badge>
                )}
              </Group>
            </Card>
          )
        })}
      </Stack>

      <CollaborativeTextField
        field={COUNTERMEASURE_FIELD}
        label="Countermeasure plan"
        placeholder="Notes on how to overcome the chosen option's blocker…"
        disabled={disabled}
      />

      <Stack gap={4}>
        <Text size="xs" fw={700} c="red.7">
          DISSENT / MINORITY OPINION
        </Text>
        <CollaborativeTextField
          field={DISSENT_FIELD}
          placeholder="Note any objections, even after a decision has been drafted…"
          disabled={disabled}
        />
      </Stack>

      <Stack gap={4}>
        <TextInput
          label="Approved by"
          placeholder="Name of the approver"
          value={decision.approvedBy ?? ''}
          disabled={disabled}
          onChange={(event) => setApprovedBy(event.currentTarget.value)}
        />
        <Group gap={4} align="baseline">
          <Text size="sm" c="dimmed">
            on
          </Text>
          {signed && signedAt ? (
            <Text size="sm">{dayjs(signedAt).format('D MMM YYYY')}</Text>
          ) : (
            <LiveClock />
          )}
        </Group>
      </Stack>

      {signed ? (
        <Badge color="gray" variant="light">
          Signed — board is read-only
        </Badge>
      ) : (
        <Button
          onClick={openModal}
          disabled={!canSign}
          color="red"
          fullWidth
          leftSection={<IconLock size={16} />}
        >
          Sign Decision
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
