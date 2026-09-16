import { Card, Divider, Text } from '@mantine/core'
import type { OptionData } from '../../../types/board'
import { optionBlockerField, optionEnablerField, optionTextField } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'

interface EvaluationColumnProps {
  options: readonly OptionData[]
  disabled?: boolean
}

/** Enabler/blocker assessment, rendered per-option so the idea text stays in view while its
 * evaluation is filled in (see `docs/ui-notes.md`). */
export function EvaluationColumn({ options, disabled }: EvaluationColumnProps) {
  if (options.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Add some options first, or jump in anyway.
      </Text>
    )
  }

  return (
    <>
      {options.map((option) => (
        <Card key={option.id} withBorder padding="sm">
          <CollaborativeTextField field={optionTextField(option.id)} disabled />
          <Divider my="xs" />
          <CollaborativeTextField
            field={optionEnablerField(option.id)}
            label="Enabler"
            placeholder="What helps or supports this option?"
            disabled={disabled}
          />
          <div style={{ height: 6 }} />
          <CollaborativeTextField
            field={optionBlockerField(option.id)}
            label="Blocker"
            placeholder="What limits or risks this option?"
            disabled={disabled}
          />
        </Card>
      ))}
    </>
  )
}
