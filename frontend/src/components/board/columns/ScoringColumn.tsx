import { Badge, Card, Divider, Group, NumberInput, Text } from '@mantine/core'
import { useSetScore } from '../../../hooks/useBoardMutations'
import type { OptionData, ScoreDimension } from '../../../types/board'
import { optionTextField, SCORE_DIMENSIONS, totalScore } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'
import { ScoreLegend } from '../ScoreLegend'

interface ScoringColumnProps {
  options: readonly OptionData[]
  disabled?: boolean
}

/** Six-dimension scoring, always shown with the 1=bad/5=good legend pinned above the inputs —
 * an inverted, unexplained cost scale was the single biggest point of confusion in the original
 * whiteboard tool (see `docs/concept.md`). */
export function ScoringColumn({ options, disabled }: ScoringColumnProps) {
  const setScore = useSetScore()
  const scoredCount = options.filter((option) => option.scores !== null).length

  const ranked = [...options].sort((a, b) => {
    const totalA = totalScore(a.scores)
    const totalB = totalScore(b.scores)
    if (totalA === null && totalB === null) return 0
    if (totalA === null) return 1
    if (totalB === null) return -1
    return totalB - totalA
  })

  if (options.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Add some options first, or jump in anyway.
      </Text>
    )
  }

  return (
    <>
      <ScoreLegend />
      {ranked.map((option, index) => {
        const total = totalScore(option.scores)
        const isTop = scoredCount > 1 && index === 0 && total !== null
        return (
          <Card key={option.id} withBorder padding="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <div style={{ flex: 1 }}>
                <CollaborativeTextField field={optionTextField(option.id)} disabled />
              </div>
              {total !== null && (
                <Badge color={isTop ? 'teal' : 'gray'} variant={isTop ? 'filled' : 'light'}>
                  {isTop ? `Top · ${total}` : total}
                </Badge>
              )}
            </Group>
            <Divider my="xs" />
            <Group gap="xs" grow>
              {SCORE_DIMENSIONS.map((dimension) => (
                <NumberInput
                  key={dimension.key}
                  label={dimension.label}
                  size="xs"
                  min={1}
                  max={5}
                  disabled={disabled}
                  value={option.scores?.[dimension.key] ?? undefined}
                  placeholder="–"
                  onChange={(value) => {
                    if (typeof value === 'number') {
                      setScore(option.id, dimension.key as ScoreDimension, value)
                    }
                  }}
                />
              ))}
            </Group>
          </Card>
        )
      })}
    </>
  )
}
