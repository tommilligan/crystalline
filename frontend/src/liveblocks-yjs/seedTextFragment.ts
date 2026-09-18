import * as Y from 'yjs'

/**
 * Writes an initial paragraph of plain text into a Y.XmlFragment, in the same shape Tiptap's
 * Collaboration extension expects (fragment > paragraph > text). Used so a fast "type and
 * press Enter" affordance can create an idea whose collaborative editor already has content,
 * instead of always starting blank. Callers seed a fragment that's already attached inside its
 * owning record (e.g. `option.get('idea')` after the option's `Y.Map` has been pushed into
 * `options`) — see `useAddIdea` — so this can piggyback on the doc's already-open transaction.
 */
export function seedTextFragment(fragment: Y.XmlFragment, text: string): void {
  const build = () => {
    const paragraph = new Y.XmlElement('paragraph')
    const textNode = new Y.XmlText()
    textNode.insert(0, text)
    paragraph.insert(0, [textNode])
    fragment.insert(0, [paragraph])
  }
  if (fragment.doc) {
    fragment.doc.transact(build)
  } else {
    build()
  }
}
