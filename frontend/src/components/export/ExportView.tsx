import { Button, Group, Stack, Text, Title } from '@mantine/core'
import { IconPrinter } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import {
  useBoardDecision,
  useBoardLifecycle,
  useBoardSituationAgreed,
  useBoardTitle,
  useRankedOptions,
  useRatingProperties,
} from '../../hooks/useBoardState'
import {
  useFragmentPlainText,
  useFragmentPlainTexts,
} from '../../liveblocks-yjs/useFragmentPlainText'
import {
  COUNTERMEASURE_FIELD,
  DISSENT_FIELD,
  optionTextField,
  SITUATION_FIELD,
} from '../../types/board'
import { DecisionSummarySection } from './DecisionSummarySection'
import classes from './ExportView.module.css'
import { SituationSection } from './SituationSection'

/** Assembles the printable export from the same live board data `BoardView` reads — Section 1
 * (Situation) and Section 4 (Decision, every option expanded), see `ExportPage` for why sections
 * 2-3 are deliberately omitted. `window.print()` plus the `@page`/`@media print` rules in
 * `ExportView.module.css` is the whole PDF story for now: Chrome's own "Save as PDF" print
 * destination already respects the A4 `@page` size, so there's no PDF library or backend
 * rendering step needed for a first cut. */
export function ExportView() {
  const title = useBoardTitle()
  const situationText = useFragmentPlainText(SITUATION_FIELD)
  const situationAgreed = useBoardSituationAgreed()
  const rankedOptions = useRankedOptions()
  const ratingProperties = useRatingProperties()
  const decision = useBoardDecision()
  const lifecycle = useBoardLifecycle()
  const countermeasureText = useFragmentPlainText(COUNTERMEASURE_FIELD)
  const dissentText = useFragmentPlainText(DISSENT_FIELD)

  const optionTextFields = useMemo(
    () => rankedOptions.map((option) => optionTextField(option.id)),
    [rankedOptions],
  )
  const optionTexts = useFragmentPlainTexts(optionTextFields)
  const titleById = useMemo(
    () =>
      new Map(
        rankedOptions.map((option, index) => [option.id, optionTexts[index] || 'Untitled option']),
      ),
    [rankedOptions, optionTexts],
  )
  const chosenTitle = decision.chosenOptionId
    ? (titleById.get(decision.chosenOptionId) ?? null)
    : null

  return (
    <div className={classes.page}>
      <Group justify="space-between" className={`${classes.toolbar} ${classes.noPrint}`}>
        <Text size="sm" c="dimmed">
          This is a read-only export. Close this tab to return to the board.
        </Text>
        <Button leftSection={<IconPrinter size={16} />} onClick={() => window.print()}>
          Print / Save as PDF
        </Button>
      </Group>

      <div className={classes.sheet}>
        <Stack gap="xl">
          <Stack gap={2}>
            <Title order={1}>{title}</Title>
            <Text size="sm" c="dimmed">
              Exported {dayjs().format('D MMM YYYY, HH:mm')}
            </Text>
          </Stack>

          <SituationSection text={situationText} agreed={situationAgreed} />

          <DecisionSummarySection
            options={rankedOptions}
            properties={ratingProperties}
            titleById={titleById}
            decision={decision}
            chosenTitle={chosenTitle}
            countermeasureText={countermeasureText}
            dissentText={dissentText}
            signed={lifecycle.state === 'signed'}
          />
        </Stack>
      </div>
    </div>
  )
}
