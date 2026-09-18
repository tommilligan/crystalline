import { ActionIcon, Group, TextInput } from '@mantine/core'
import { IconPlus, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { useAddIdea, useRemoveIdea } from '../../../hooks/useBoardMutations'
import type { OptionData } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { NextButton } from '../NextButton'

interface OptionsColumnProps {
  options: readonly OptionData[]
  disabled?: boolean
  active?: boolean
  onAdvancePhase?: () => void
}

/** Pure idea generation — no idea is bad. Optimised for a facilitator transcribing a room's
 * ideas live: type-and-press-Enter keeps the input focused for rapid successive entries. The
 * input stays pinned below the list so newly added ideas appear above it, in order. */
export function OptionsColumn({ options, disabled, active, onAdvancePhase }: OptionsColumnProps) {
  const addIdea = useAddIdea()
  const removeIdea = useRemoveIdea()
  const [draft, setDraft] = useState('')

  function handleAdd() {
    const text = draft.trim()
    if (!text || disabled) return
    // Seeded with the typed text at creation time (see `useAddIdea`) rather than created blank
    // and seeded afterwards — the option's idea fragment isn't addressable from here until the
    // record it lives inside is already in `options`.
    addIdea(text)
    setDraft('')
  }

  return (
    <>
      {options.map((option) => (
        <Group key={option.id} align="center" wrap="nowrap" gap="xs">
          <div style={{ flex: 1, minWidth: 0 }}>
            <CollaborativeTextField
              fragment={option.ideaFragment}
              placeholder="Describe this idea…"
              disabled={disabled}
            />
          </div>
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label="Remove idea"
            disabled={disabled}
            onClick={() => removeIdea(option.id)}
          >
            <IconX size={16} />
          </ActionIcon>
        </Group>
      ))}
      <TextInput
        rightSection={<IconPlus size={16} />}
        placeholder="Type an option, press Enter"
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
      {active && onAdvancePhase && <NextButton onClick={onAdvancePhase} />}
    </>
  )
}
