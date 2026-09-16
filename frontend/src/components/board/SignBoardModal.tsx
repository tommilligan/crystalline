import { Button, Group, Modal, Text } from '@mantine/core'

interface SignBoardModalProps {
  opened: boolean
  onClose: () => void
  onConfirm: () => void
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
        <Button color="teal" onClick={onConfirm}>
          Sign and lock
        </Button>
      </Group>
    </Modal>
  )
}
