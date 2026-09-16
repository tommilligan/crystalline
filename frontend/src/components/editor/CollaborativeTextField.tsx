import { Box, Text } from '@mantine/core'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCaret from '@tiptap/extension-collaboration-caret'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useSelf } from '../../liveblocks.config'
import { useYjsDoc } from '../../liveblocks-yjs/YjsRoomProvider'
import classes from './CollaborativeTextField.module.css'

interface CollaborativeTextFieldProps {
  /** Name of the Y.XmlFragment this field reads/writes within the room's shared Yjs doc. */
  field: string
  label?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * A single collaboratively-edited text field (an idea, an enabler/blocker, the situation
 * statement, a countermeasure, ...). Backed by a Y.XmlFragment synced through Liveblocks, so
 * concurrent edits from multiple participants merge automatically instead of last-write-wins.
 */
export function CollaborativeTextField({
  field,
  label,
  placeholder,
  disabled,
}: CollaborativeTextFieldProps) {
  const { doc, provider } = useYjsDoc()
  const self = useSelf()

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Placeholder.configure({ placeholder }),
        Collaboration.configure({ document: doc, field }),
        CollaborationCaret.configure({
          provider,
          user: {
            name: self?.presence.name ?? 'Anonymous',
            color: self?.presence.color ?? '#868e96',
          },
        }),
      ],
      editable: !disabled,
      editorProps: {
        attributes: { class: classes.editor },
      },
      // Collaboration/CollaborationCaret set Yjs awareness state synchronously during editor
      // construction, which notifies other components' presence subscriptions (e.g.
      // PresenceAvatars). Creating the editor immediately during render does that setState
      // while this component is still rendering, which React disallows. Defer construction to
      // the mount effect instead.
      immediatelyRender: false,
    },
    [field, doc, provider, disabled],
  )

  return (
    <Box className={classes.wrapper} data-disabled={disabled || undefined}>
      {label && (
        <Text size="xs" fw={500} c="dimmed" mb={4}>
          {label}
        </Text>
      )}
      <EditorContent editor={editor} />
    </Box>
  )
}
