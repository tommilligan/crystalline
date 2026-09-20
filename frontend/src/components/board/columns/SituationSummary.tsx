import { Badge, Stack, Text } from '@mantine/core'

interface SituationSummaryProps {
  text: string
  agreed: boolean
}

/** Plain, non-interactive readout of the situation statement plus its agreement badge — shared by
 * `SituationColumn`'s inactive view and the printable export's `SituationSection`, so the two stay
 * in sync by construction rather than by two hand-maintained copies (same idea as
 * `EvaluationSummaryBody` in `OptionSummaries.tsx`). */
export function SituationSummary({ text, agreed }: SituationSummaryProps) {
  return (
    <Stack gap="xs">
      <Text style={{ whiteSpace: 'pre-wrap' }} c={text ? undefined : 'dimmed'}>
        {text || 'No problem statement recorded.'}
      </Text>
      <Badge color={agreed ? 'teal' : 'gray'} variant="light" style={{ alignSelf: 'flex-start' }}>
        {agreed ? 'Agreed' : 'Not agreed'}
      </Badge>
    </Stack>
  )
}
