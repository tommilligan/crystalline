import { Box, Text } from '@mantine/core'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { type CSSProperties, useId } from 'react'
import type * as Y from 'yjs'
import { loadIdentity } from '../../lib/localIdentity'
import { useOptionalLiveblocksYjsProvider } from '../../liveblocks-yjs/BoardDocProvider'
import classes from './CollaborativeTextField.module.css'

interface CollaborativeTextFieldProps {
  /** The live `Y.XmlFragment` this field reads/writes — a sibling value inside the record it
   * belongs to (an option, the decision, `meta`), not a doc-scoped name: see
   * `docs/local-first-mode-plan.md` on why fragments are nested rather than kept as a flat
   * top-level namespace. Callers get it from the record they're already rendering (e.g. an
   * `OptionCard` already has its `OptionData` in scope). */
  fragment: Y.XmlFragment
  label?: string
  placeholder?: string
  disabled?: boolean
  /** Minimum visible rows, so the box is clearly a multiline area (e.g. an option summary)
   * rather than a single-line input, before the user has typed enough to grow it. */
  minRows?: number
  /** Accessible name for the editable region. TipTap's `Placeholder` extension paints via a CSS
   * `::before` on a `data-placeholder` attribute (see its source), not the native `placeholder`
   * attribute — screen readers never see it, so unlike a Mantine `TextInput` this field's
   * `placeholder` alone gives assistive tech nothing to announce. Every caller must supply one of
   * `ariaLabel` (when there's no adjacent visible label) or `ariaLabelledBy` (the id of a visible
   * heading/text already serving as this field's label) so the field has a name at all. `label`
   * alone (the visible caption this component renders itself) already covers it and needs no
   * extra prop. */
  ariaLabel?: string
  ariaLabelledBy?: string
}

/**
 * A single collaboratively-edited text field (an idea, an enabler/blocker, the situation
 * statement, a countermeasure, ...). Backed directly by a `Y.XmlFragment`, so concurrent edits
 * from multiple participants merge automatically instead of last-write-wins — in sharable mode
 * that fragment is synced through Liveblocks; in local-only mode it's the same fragment type,
 * just never transported anywhere. Collaboration cursors (`CollaborationCaret`) only make sense
 * when there's an actual Liveblocks provider to source awareness from, so that extension is
 * conditional on one existing; the `Collaboration` (TipTap <-> Yjs) binding itself is always on.
 */
export function CollaborativeTextField({
  fragment,
  label,
  placeholder,
  disabled,
  minRows,
  ariaLabel,
  ariaLabelledBy,
}: CollaborativeTextFieldProps) {
  const provider = useOptionalLiveblocksYjsProvider()
  const identity = loadIdentity()
  const generatedLabelId = useId()
  const labelId = label ? generatedLabelId : undefined
  const labelledBy = ariaLabelledBy ?? labelId

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        // showOnlyCurrent: false — otherwise the placeholder only paints while the cursor is in
        // this field, so clearing the text and clicking away leaves it blank instead of showing
        // the placeholder again.
        Placeholder.configure({ placeholder, showOnlyCurrent: false }),
        Collaboration.configure({ fragment }),
        ...(provider
          ? [
              CollaborationCaret.configure({
                provider,
                user: { name: identity.name, color: identity.color },
              }),
            ]
          : []),
      ],
      editable: !disabled,
      editorProps: {
        attributes: {
          class: classes.editor,
          'aria-multiline': 'true',
          ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
          ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
        },
      },
      // Collaboration/CollaborationCaret set Yjs awareness state synchronously during editor
      // construction, which notifies other components' presence subscriptions (e.g.
      // PresenceAvatars). Creating the editor immediately during render does that setState
      // while this component is still rendering, which React disallows. Defer construction to
      // the mount effect instead.
      immediatelyRender: false,
    },
    [fragment, provider, disabled, ariaLabel, labelledBy],
  )

  return (
    <Box
      className={classes.wrapper}
      data-disabled={disabled || undefined}
      style={minRows ? ({ '--cbf-min-height': `${minRows * 1.4}em` } as CSSProperties) : undefined}
    >
      {label && (
        <Text id={labelId} size="xs" fw={500} c="dimmed" mb={4}>
          {label}
        </Text>
      )}
      <EditorContent editor={editor} />
    </Box>
  )
}
