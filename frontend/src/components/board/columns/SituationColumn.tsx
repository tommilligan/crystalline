import { Stack, Text } from '@mantine/core'
import { SITUATION_FIELD } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { SessionTimer } from '../SessionTimer'

interface SituationColumnProps {
  disabled?: boolean
}

export function SituationColumn({ disabled }: SituationColumnProps) {
  return (
    <Stack gap="sm">
      <Text size="xs" fw={500} c="dimmed">
        Problem statement
      </Text>
      <CollaborativeTextField
        field={SITUATION_FIELD}
        placeholder="Describe the problem. Aim for team consensus before moving on — this phase is usually time-boxed to 15–20 minutes."
        disabled={disabled}
      />
      <SessionTimer disabled={disabled} />
    </Stack>
  )
}
