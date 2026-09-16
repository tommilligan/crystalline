import * as Y from 'yjs'

/**
 * Writes an initial paragraph of plain text into a Y.XmlFragment, in the same shape Tiptap's
 * Collaboration extension expects (fragment > paragraph > text). Used so a fast "type and
 * press Enter" affordance can create an idea whose collaborative editor already has content,
 * instead of always starting blank.
 */
export function seedTextFragment(doc: Y.Doc, field: string, text: string): void {
  const fragment = doc.getXmlFragment(field)
  doc.transact(() => {
    const paragraph = new Y.XmlElement('paragraph')
    const textNode = new Y.XmlText()
    textNode.insert(0, text)
    paragraph.insert(0, [textNode])
    fragment.insert(0, [paragraph])
  })
}
