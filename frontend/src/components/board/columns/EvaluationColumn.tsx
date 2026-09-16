import { Box, Button, Card, Divider, Group, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconCheck, IconChevronRight, IconStack2, IconX } from '@tabler/icons-react'
import { useOptionWalkthrough } from '../../../hooks/useOptionWalkthrough'
import type { OptionData } from '../../../types/board'
import { optionBlockerField, optionEnablerField, optionTextField } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { EmptyColumnState } from '../EmptyColumnState'

interface EvaluationColumnProps {
  options: readonly OptionData[]
  disabled?: boolean
}

/** Enabler/blocker assessment, rendered per-option so the idea text stays in view while its
 * evaluation is filled in (see `docs/ui-notes.md`). Mirrors the phase-to-phase "Go to next
 * step" flow one level down: one option is emphasized at a time, the rest are greyed out but
 * still visible and editable, and clicking into any option (or the "Next" button) advances
 * which one is active. */
export function EvaluationColumn({ options, disabled }: EvaluationColumnProps) {
  const { activeOption, nextOption, focus } = useOptionWalkthrough(options)

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
      {options.map((option) => {
        const emphasized = option.id === activeOption?.id
        return (
          <Card
            key={option.id}
            withBorder
            padding="sm"
            radius="sm"
            onClickCapture={() => focus(option.id)}
            style={{
              borderColor: emphasized
                ? 'var(--mantine-color-blue-5)'
                : 'var(--mantine-color-gray-3)',
              borderWidth: 2,
              opacity: emphasized ? 1 : 0.55,
              transition: 'opacity 0.2s ease, border-color 0.2s ease',
            }}
          >
            <CollaborativeTextField field={optionTextField(option.id)} disabled />
            <Divider my="xs" />
            <Stack gap="xs">
              <Box>
                <Group gap={6} mb={4}>
                  <ThemeIcon size={16} radius="xl" color="teal" variant="filled">
                    <IconCheck size={11} />
                  </ThemeIcon>
                  <Text size="xs" fw={700} c="teal.8">
                    Good
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
                    Bad
                  </Text>
                </Group>
                <CollaborativeTextField
                  field={optionBlockerField(option.id)}
                  placeholder="What limits or risks this option?"
                  disabled={disabled}
                />
              </Box>
              {emphasized && nextOption && (
                <Button
                  variant="light"
                  color="blue"
                  fullWidth
                  rightSection={<IconChevronRight size={16} />}
                  onClick={(event) => {
                    event.stopPropagation()
                    focus(nextOption.id)
                  }}
                >
                  Next option
                </Button>
              )}
            </Stack>
          </Card>
        )
      })}
    </>
  )
}
