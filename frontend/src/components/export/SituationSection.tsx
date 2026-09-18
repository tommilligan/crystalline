import { Badge, Stack, Text, Title } from '@mantine/core'

interface SituationSectionProps {
  text: string
  agreed: boolean
}

/** Section 1 of the export — just the problem statement and whether the team agreed on it, per
 * the "ignore sections 2-3" decision: every other phase's input is already folded into Section 4
 * by the time a board is worth exporting. */
export function SituationSection({ text, agreed }: SituationSectionProps) {
  return (
    <Stack gap="xs" mb="xl">
      <Title order={2}>1. Situation</Title>
      <Text style={{ whiteSpace: 'pre-wrap' }} c={text ? undefined : 'dimmed'}>
        {text || 'No problem statement recorded.'}
      </Text>
      <Badge color={agreed ? 'teal' : 'gray'} variant="light" style={{ alignSelf: 'flex-start' }}>
        {agreed ? 'Team agreed' : 'Not marked as agreed'}
      </Badge>
    </Stack>
  )
}
