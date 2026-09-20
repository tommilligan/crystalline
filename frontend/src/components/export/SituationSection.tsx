import { Stack, Title } from '@mantine/core'
import { SituationSummary } from '../board/columns/SituationSummary'

interface SituationSectionProps {
  text: string
  agreed: boolean
}

/** Section 1 of the export — just the problem statement and whether the team agreed on it, per
 * the "ignore sections 2-3" decision: every other phase's input is already folded into Section 4
 * by the time a board is worth exporting. Reuses `SituationSummary` — the same read-only readout
 * `SituationColumn` renders once the team moves on from editing it — so the two stay in sync by
 * construction. */
export function SituationSection({ text, agreed }: SituationSectionProps) {
  return (
    <Stack gap="xs">
      <Title order={2}>Situation</Title>
      <SituationSummary text={text} agreed={agreed} />
    </Stack>
  )
}
