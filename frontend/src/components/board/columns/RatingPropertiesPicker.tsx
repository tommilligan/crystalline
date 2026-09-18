import { ActionIcon, Group, Stack, Text, TextInput } from '@mantine/core'
import { IconPlus, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import {
  useAddRatingProperty,
  useRemoveRatingProperty,
  useRenameRatingProperty,
} from '../../../hooks/useBoardMutations'
import type { RatingProperty } from '../../../types/board'

interface RatingPropertiesPickerProps {
  properties: readonly RatingProperty[]
  disabled?: boolean
}

/** Compact list editor for the numeric rating properties every option is scored against, shown
 * at the top of the Evaluation column while it's active. Mirrors `OptionsColumn`'s add/remove
 * list pattern. Properties are shared board configuration (`Storage.ratingProperties`), not
 * per-option data — removing one doesn't touch any option's already-recorded scores, they just
 * stop counting towards `totalScore` (see that function's doc comment). */
export function RatingPropertiesPicker({ properties, disabled }: RatingPropertiesPickerProps) {
  const addProperty = useAddRatingProperty()
  const removeProperty = useRemoveRatingProperty()
  const renameProperty = useRenameRatingProperty()
  const [draft, setDraft] = useState('')

  function handleAdd() {
    const label = draft.trim()
    if (!label || disabled) return
    addProperty(label)
    setDraft('')
  }

  return (
    <Stack gap={4}>
      <Text size="xs" fw={700} c="dimmed">
        Rating properties
      </Text>
      {properties.map((property) => (
        <Group key={property.id} align="center" wrap="nowrap" gap="xs">
          <TextInput
            size="xs"
            style={{ flex: 1, minWidth: 0 }}
            value={property.label}
            disabled={disabled}
            onChange={(event) => renameProperty(property.id, event.currentTarget.value)}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            aria-label={`Remove ${property.label || 'rating property'}`}
            disabled={disabled}
            onClick={() => removeProperty(property.id)}
          >
            <IconX size={14} />
          </ActionIcon>
        </Group>
      ))}
      <TextInput
        size="xs"
        rightSection={<IconPlus size={14} />}
        placeholder="Add a rating property, press Enter"
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            handleAdd()
          }
        }}
      />
    </Stack>
  )
}
