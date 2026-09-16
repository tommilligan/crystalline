import { Box, Card, Divider, Group, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconCheck, IconX } from '@tabler/icons-react'
import { useOptionWalkthrough } from '../../../hooks/useOptionWalkthrough'
import type { OptionData } from '../../../types/board'
import { optionBlockerField, optionEnablerField, optionTextField } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { EmptyColumnState } from '../EmptyColumnState'
import { NextButton } from '../NextButton'

interface EvaluationColumnProps {
  options: readonly OptionData[]
  disabled?: boolean
  active?: boolean
  onAdvancePhase?: () => void
}

/** Enabler/blocker assessment, rendered per-option so the idea text stays in view while its
 * evaluation is filled in (see `docs/ui-notes.md`). Mirrors the phase-to-phase "Next >" flow
 * one level down: one option is focused at a time, the rest are greyed out but still visible
 * and editable, and clicking into any option (or the "Next >" button) advances which one is
 * focused. That per-option focus is only ever shown while this column itself is `active`
 * (the selected phase) — otherwise the whole column is already dimmed as a unit by
 * `BoardColumnShell`, and layering a second, per-option dim on top of that would double-fade
 * it. The walkthrough position is still tracked while inactive, just not displayed.
 *
 * The "Next >" button always lives in the same spot — attached to the focused option's card —
 * regardless of what it does: while there's a next option it advances the walkthrough, and on
 * the last option it advances the phase instead. Only its action changes, never its position. */
export function EvaluationColumn({
  options,
  disabled,
  active,
  onAdvancePhase,
}: EvaluationColumnProps) {
  const { activeOption, nextOption, focus } = useOptionWalkthrough(options)
  const advance = nextOption ? () => focus(nextOption.id) : onAdvancePhase

  if (options.length === 0) {
    return (
      <>
        <EmptyColumnState />
        {active && advance && <NextButton onClick={advance} />}
      </>
    )
  }

  return (
    <>
      {options.map((option) => {
        const focused = active && option.id === activeOption?.id
        return (
          <Card
            key={option.id}
            withBorder
            padding="sm"
            radius="sm"
            onClickCapture={() => focus(option.id)}
            style={{
              borderColor: focused ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-3)',
              borderWidth: 2,
              opacity: !active || focused ? 1 : 0.55,
              transition: 'opacity 0.2s ease, border-color 0.2s ease',
            }}
          >
            <CollaborativeTextField field={optionTextField(option.id)} disabled />
            <Divider my="xs" />
            <Stack gap="xs">
              <Group gap="xs" align="flex-start" grow wrap="nowrap">
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
                    minRows={2}
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
                    minRows={2}
                  />
                </Box>
              </Group>
              {focused && advance && <NextButton onClick={advance} />}
            </Stack>
          </Card>
        )
      })}
    </>
  )
}
