import { Accordion, Box, Group, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconCheck, IconX } from '@tabler/icons-react'
import { useOptionWalkthrough } from '../../../hooks/useOptionWalkthrough'
import { useFragmentPlainText } from '../../../liveblocks-yjs/useFragmentPlainText'
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

function EvaluationAccordionControl({ option }: { option: OptionData }) {
  const text = useFragmentPlainText(optionTextField(option.id))
  return (
    <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
      {text || 'Untitled option'}
    </Text>
  )
}

function EvaluationAccordionPanel({
  option,
  advance,
  disabled,
}: {
  option: OptionData
  advance?: () => void
  disabled?: boolean
}) {
  return (
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
      {advance && <NextButton onClick={advance} />}
    </Stack>
  )
}

/** Enabler/blocker assessment, walked through one option at a time via an Accordion (mirroring
 * the phase-to-phase "Next >" flow one level down and matching `ScoringColumn`'s pattern): only
 * the active option's Good/Bad fields are expanded, the rest collapse to just their idea text,
 * and clicking into any option (or the "Next >" button) advances which one is focused. That
 * expand/collapse distinction — and its "Next >" button — is only shown while this column itself
 * is `active` (the selected phase) — otherwise every item stays collapsed and undecorated, since
 * the whole column is already dimmed as a unit by `BoardColumnShell`. The walkthrough position is
 * still tracked while inactive, just not displayed.
 *
 * The "Next >" button always lives in the same spot — the focused option's panel — regardless of
 * what it does: while there's a next option it advances the walkthrough, and on the last option
 * it advances the phase instead. Only its action changes, never its position. */
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
    <Accordion
      value={active ? (activeOption?.id ?? null) : null}
      onChange={(value) => value && focus(value)}
      disableCollapse
      variant="separated"
    >
      {options.map((option) => (
        <Accordion.Item key={option.id} value={option.id}>
          <Accordion.Control>
            <EvaluationAccordionControl option={option} />
          </Accordion.Control>
          <Accordion.Panel>
            <EvaluationAccordionPanel
              option={option}
              advance={active && option.id === activeOption?.id ? advance : undefined}
              disabled={disabled}
            />
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
