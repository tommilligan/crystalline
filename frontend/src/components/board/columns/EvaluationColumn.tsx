import { Box, Card, Divider, Group, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconCheck, IconStack2, IconX } from '@tabler/icons-react'
import type { OptionData } from '../../../types/board'
import { optionBlockerField, optionEnablerField, optionTextField } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { EmptyColumnState } from '../EmptyColumnState'

interface EvaluationColumnProps {
  options: readonly OptionData[]
  disabled?: boolean
}

/** Enabler/blocker assessment, rendered per-option so the idea text stays in view while its
 * evaluation is filled in (see `docs/ui-notes.md`). */
export function EvaluationColumn({ options, disabled }: EvaluationColumnProps) {
  if (options.length === 0) {
    return (
      <EmptyColumnState
        icon={IconStack2}
        title="No Options to Evaluate Yet"
        description="Add some options in the Options column first, or jump in anyway."
        placeholder="Placeholder evaluation space"
      />
    )
  }

  return (
    <>
      {options.map((option) => (
        <Card key={option.id} withBorder padding="sm" radius="sm">
          <CollaborativeTextField field={optionTextField(option.id)} disabled />
          <Divider my="xs" />
          <Stack gap="xs">
            <Box>
              <Group gap={6} mb={4}>
                <ThemeIcon size={16} radius="xl" color="teal" variant="filled">
                  <IconCheck size={11} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="teal.8">
                  ENABLER
                </Text>
              </Group>
              <CollaborativeTextField
                field={optionEnablerField(option.id)}
                placeholder="What helps or supports this option?"
                disabled={disabled}
              />
            </Box>
            <Box>
              <Group gap={6} mb={4}>
                <ThemeIcon size={16} radius="xl" color="red" variant="filled">
                  <IconX size={11} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="red.8">
                  BLOCKER
                </Text>
              </Group>
              <CollaborativeTextField
                field={optionBlockerField(option.id)}
                placeholder="What limits or risks this option?"
                disabled={disabled}
              />
            </Box>
          </Stack>
        </Card>
      ))}
    </>
  )
}
