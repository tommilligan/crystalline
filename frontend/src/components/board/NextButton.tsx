import { Button } from '@mantine/core'

/**
 * The single "advance" action, wherever it appears — moving to the next option within a
 * column's walkthrough, or moving to the next phase. Only ever rendered once on screen at a
 * time (see the `active` prop on each column component): a column shows this for its own
 * next-option step while one remains, then for the next-phase step once it doesn't.
 */
export function NextButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      variant="light"
      color="blue"
      fullWidth
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      Next &gt;
    </Button>
  )
}
