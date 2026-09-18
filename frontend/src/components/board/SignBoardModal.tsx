import { Button, Group, Modal, Text } from '@mantine/core'
import type { MouseEvent } from 'react'

interface SignBoardModalProps {
  opened: boolean
  onClose: () => void
  /** Receives the confirming click event so the caller can anchor a celebratory effect at the
   * click point (see `DecisionColumn`'s confetti burst). */
  onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

/** Signing is irreversible in the MVP — no "unsign" action exists (see `docs/mvp-scope.md`).
 * This confirmation is deliberately a real speed bump, not a formality. */
export function SignBoardModal({ opened, onClose, onConfirm }: SignBoardModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Sign this board?" centered>
      <Text size="sm" mb="lg">
        This will lock the board — every field across all five phases becomes read-only. You can
        still Clone it later to make changes, but there is no way to unsign it.
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button color="teal" onClick={(event) => onConfirm(event)}>
          Sign and lock
        </Button>
      </Group>
    </Modal>
  )
}
