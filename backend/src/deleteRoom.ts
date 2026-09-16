import { isValidRoomId } from '@crystalline/shared'
import type { Request, Response } from 'express'
import { liveblocks } from './liveblocksClient.js'

/** Deletes a board's Liveblocks room outright — this is the actual data (options, scores,
 * decision, collaborative text), not just the client-side "my boards" list entry on the home
 * page. There are no real accounts in the MVP (see `docs/mvp-scope.md`), so anyone who knows a
 * room id can delete it; the frontend only exposes this behind an explicit confirmation. */
export async function handleDeleteRoom(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params

  if (!isValidRoomId(roomId)) {
    res.status(400).json({ error: 'bad_request', reason: 'Invalid room id' })
    return
  }

  try {
    await liveblocks.deleteRoom(roomId)
  } catch (error) {
    // Deleting a room that's already gone (e.g. double-click, already deleted elsewhere) isn't
    // an error from the caller's point of view — the end state they wanted is achieved either way.
    const status = (error as { status?: number }).status
    if (status !== 404) {
      throw error
    }
  }

  res.status(204).end()
}
