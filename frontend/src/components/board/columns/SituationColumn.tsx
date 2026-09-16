import { SITUATION_FIELD } from '../../../types/board'
import { CollaborativeTextField } from '../../editor/CollaborativeTextField'

interface SituationColumnProps {
  disabled?: boolean
}

export function SituationColumn({ disabled }: SituationColumnProps) {
  return (
    <CollaborativeTextField
      field={SITUATION_FIELD}
      placeholder="Describe the problem. Aim for team consensus before moving on — this phase is usually time-boxed to 15–20 minutes."
      disabled={disabled}
    />
  )
}
