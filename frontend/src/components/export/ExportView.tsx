import { Button, Group, Stack, Text, Title } from '@mantine/core'
import { IconPrinter } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import {
  useBoardDecision,
  useBoardLifecycle,
  useBoardOptions,
  useBoardSituationAgreed,
  useBoardTitle,
  useNextSteps,
  useNextStepsCommitted,
  useRankedOptions,
  useRatingProperties,
  useSituationFragment,
} from '../../hooks/useBoardState'
import {
  useFragmentPlainText,
  useFragmentPlainTexts,
} from '../../liveblocks-yjs/useFragmentPlainText'
import { optionDisplayId } from '../../types/board'
import { DecisionSummarySection } from './DecisionSummarySection'
import classes from './ExportView.module.css'
import { SituationSection } from './SituationSection'

/** Assembles the printable export from the same live board data `BoardView` reads — the
 * Situation section and the Decision/Options section (every option expanded), see `ExportPage`
 * for why the ideation/evaluation phases are deliberately omitted. `window.print()` plus the
 * `@page`/`@media print` rules in `ExportView.module.css` is the whole PDF story for now:
 * Chrome's own "Save as PDF" print destination already respects the A4 `@page` size, so there's
 * no PDF library or backend rendering step needed for a first cut. */
export function ExportView({ boardId }: { boardId: string }) {
  const title = useBoardTitle()
  const situationText = useFragmentPlainText(useSituationFragment())
  const situationAgreed = useBoardSituationAgreed()
  const canonicalOptions = useBoardOptions()
  const rankedOptions = useRankedOptions()
  const ratingProperties = useRatingProperties()
  const decision = useBoardDecision()
  const nextSteps = useNextSteps()
  const nextStepsCommitted = useNextStepsCommitted()
  const lifecycle = useBoardLifecycle()
  const countermeasureText = useFragmentPlainText(decision.countermeasureFragment)
  const dissentText = useFragmentPlainText(decision.dissentFragment)

  const optionTextFragments = useMemo(
    () => rankedOptions.map((option) => option.ideaFragment),
    [rankedOptions],
  )
  const optionTexts = useFragmentPlainTexts(optionTextFragments)
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
  // Derived from `canonicalOptions` (creation order), not `rankedOptions` (score order), so an
  // option's letter here matches what `EvaluationColumn`/`DecisionColumn` show for it elsewhere.
  const displayIdById = useMemo(
    () => new Map(canonicalOptions.map((option, index) => [option.id, optionDisplayId(index)])),
    [canonicalOptions],
  )

  const boardUrl = `${window.location.origin}/board/${boardId}`

  return (
    <div className={classes.page} data-mantine-color-scheme="light">
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
          <Title order={1}>{title}</Title>

          <SituationSection text={situationText} agreed={situationAgreed} />

          <DecisionSummarySection
            options={rankedOptions}
            properties={ratingProperties}
            titleById={titleById}
            displayIdById={displayIdById}
            decision={decision}
            chosenTitle={chosenTitle}
            countermeasureText={countermeasureText}
            dissentText={dissentText}
            signed={lifecycle.state === 'signed'}
            nextSteps={nextSteps}
            nextStepsCommitted={nextStepsCommitted.committed}
          />

          <Text size="xs" c="dimmed" className={classes.footer}>
            Exported {dayjs().format('D MMM YYYY, HH:mm')} from <a href={boardUrl}>{boardUrl}</a>
          </Text>
        </Stack>
      </div>
    </div>
  )
}
