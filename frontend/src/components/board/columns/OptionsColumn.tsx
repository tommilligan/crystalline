import { ActionIcon, Card, Group, Text, TextInput } from '@mantine/core'
import { useState } from 'react'
import { useAddIdea, useRemoveIdea } from '../../../hooks/useBoardMutations'
import { seedTextFragment } from '../../../liveblocks-yjs/seedTextFragment'
import { useYjsDoc } from '../../../liveblocks-yjs/YjsRoomProvider'
import type { OptionData } from '../../../types/board'
import { optionTextField } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'

interface OptionsColumnProps {
  options: readonly OptionData[]
  disabled?: boolean
}

/** Pure idea generation — no idea is bad. Optimised for a facilitator transcribing a room's
 * ideas live: type-and-press-Enter keeps the input focused for rapid successive entries. */
export function OptionsColumn({ options, disabled }: OptionsColumnProps) {
  const addIdea = useAddIdea()
  const removeIdea = useRemoveIdea()
  const { doc } = useYjsDoc()
  const [draft, setDraft] = useState('')

  function handleAdd() {
    const text = draft.trim()
    if (!text || disabled) return
    const id = addIdea()
    seedTextFragment(doc, optionTextField(id), text)
    setDraft('')
  }

  return (
    <>
      <TextInput
        placeholder="Type an idea and press Enter…"
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
      {options.length === 0 && (
        <Text size="sm" c="dimmed">
          No ideas yet — add some above, or jump to another phase anyway.
        </Text>
      )}
      {options.map((option) => (
        <Card key={option.id} withBorder padding="xs">
          <Group align="flex-start" wrap="nowrap" gap="xs">
            <div style={{ flex: 1 }}>
              <CollaborativeTextField
                field={optionTextField(option.id)}
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
              ✕
            </ActionIcon>
          </Group>
        </Card>
      ))}
    </>
  )
}
