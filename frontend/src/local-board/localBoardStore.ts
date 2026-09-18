import { clearDocument, IndexeddbPersistence, storeState } from 'y-indexeddb'
import * as Y from 'yjs'
import { createBoardDoc } from '../lib/boardDoc'

/**
 * Returns a stable, collision-avoiding IndexedDB database name for a given board id.
 * Uses the prefix 'crystalline-board-' to clearly identify boards and avoid collisions
 * with other data stored in IndexedDB by this app or others.
 */
export function localBoardDbName(boardId: string): string {
  return `crystalline-board-${boardId}`
}

/**
 * One-shot creation of a brand-new local board (used when a user creates a new local board
 * before any provider mounts). Must complete the following sequence in order:
 * 1. Create a fresh Y.Doc
 * 2. Create IndexeddbPersistence to open/create the IndexedDB database
 * 3. Await .whenSynced to ensure the database is fully open before writing
 * 4. Call createBoardDoc to populate the doc with initial shape
 * 5. Await storeState(persistence, true) to force-flush the write durably
 * 6. Destroy persistence and doc
 *
 * This ordering ensures the initial board content is durably saved before we finish.
 */
export async function createLocalBoardDoc(boardId: string, title: string): Promise<void> {
  const doc = new Y.Doc()
  const persistence = new IndexeddbPersistence(localBoardDbName(boardId), doc)

  try {
    // Ensure the database is fully open before writing
    await persistence.whenSynced

    // Populate the doc with the board's initial shape (idempotent)
    createBoardDoc(doc, title)

    // Force-flush the write to IndexedDB durably before we tear down
    await storeState(persistence, true)
  } finally {
    // Always clean up, even if something goes wrong
    await persistence.destroy()
    doc.destroy()
  }
}

/**
 * Checks whether a local board with the given id has been created (persisted to IndexedDB).
 * Prefers a non-mutating check: uses indexedDB.databases() if available (modern browsers)
 * to check for the database name without opening/creating anything.
 *
 * If indexedDB.databases is not available (older browsers), falls back to opening an
 * IndexeddbPersistence, awaiting .whenSynced, and checking if the doc has been populated
 * (by checking meta.has('title')). In the fallback path, if the board doesn't exist,
 * cleans up the empty database we just accidentally created via clearDocument().
 */
export async function localBoardExists(boardId: string): Promise<boolean> {
  const dbName = localBoardDbName(boardId)

  // Modern browsers: check the database list without opening/creating
  if (indexedDB.databases) {
    const databases = await indexedDB.databases()
    return databases.some((db) => db.name === dbName)
  }

  // Fallback for older browsers: open the database and check if it has content
  const doc = new Y.Doc()
  const persistence = new IndexeddbPersistence(dbName, doc)

  try {
    await persistence.whenSynced
    const hasTitle = doc.getMap('meta').has('title')

    // If we accidentally created an empty database (board doesn't exist), clean it up
    if (!hasTitle) {
      await persistence.destroy()
      await clearDocument(dbName)
      return false
    }

    return true
  } finally {
    await persistence.destroy()
    doc.destroy()
  }
}

/**
 * Permanently deletes a board's local data from IndexedDB.
 * Uses clearDocument to delete the entire database by name.
 */
export async function deleteLocalBoardData(boardId: string): Promise<void> {
  await clearDocument(localBoardDbName(boardId))
}
