import { Pill, PillsInput, Stack, Text, Title } from '@mantine/core'
import { useRef, useState } from 'react'
import { useAddRatingProperty, useRemoveRatingProperty } from '../../../hooks/useBoardMutations'
import type { RatingProperty } from '../../../types/board'

interface RatingPropertiesPickerProps {
  properties: readonly RatingProperty[]
  disabled?: boolean
}

/** Compact editor for the numeric rating properties every option is scored against, shown at the
 * top of the Evaluation column while it's active. Existing properties are prefilled as pills in a
 * Mantine `PillsInput`; typing a new label and pressing Enter adds one, and each pill's remove
 * button drops it — there's no inline rename, so relabelling a property is remove-and-re-add.
 * Properties are shared board configuration (`Storage.ratingProperties`), not per-option data —
 * removing one doesn't touch any option's already-recorded scores, they just stop counting
 * towards `totalScore` (see that function's doc comment). */
export function RatingPropertiesPicker({ properties, disabled }: RatingPropertiesPickerProps) {
  const addProperty = useAddRatingProperty()
  const removeProperty = useRemoveRatingProperty()
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleAdd() {
    const label = draft.trim()
    if (!label || disabled) return
    addProperty(label)
    setDraft('')
  }

  return (
    <Stack gap={4}>
      <Stack gap={0}>
        <Title order={5} size="xs">
          Scoring
        </Title>
        <Text size="xs" c="dimmed">
          Change which properties you care about here.
        </Text>
      </Stack>
      <PillsInput size="xs" disabled={disabled} onClick={() => inputRef.current?.focus()}>
        <Pill.Group>
          {properties.map((property) => (
            <Pill
              key={property.id}
              withRemoveButton={!disabled}
              onRemove={() => removeProperty(property.id)}
            >
              {property.label}
            </Pill>
          ))}
          <PillsInput.Field
            ref={inputRef}
            aria-label="Add a rating property"
            placeholder="Add a rating property, press Enter"
            value={draft}
            disabled={disabled}
            onChange={(event) => setDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleAdd()
              } else if (event.key === 'Backspace' && draft.length === 0 && properties.length > 0) {
                // The pills' own remove buttons are mouse-only (Mantine hides them from the a11y
                // tree, expecting Backspace as the keyboard/screen-reader path) — mirror that here.
                removeProperty(properties[properties.length - 1].id)
              }
            }}
          />
        </Pill.Group>
      </PillsInput>
    </Stack>
  )
}
