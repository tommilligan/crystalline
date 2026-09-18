import { isValidRoomId } from '@crystalline/shared'
import type { Request, Response } from 'express'
import { liveblocks } from './liveblocksClient.js'

/** Checks whether a board's Liveblocks room exists, without spending an auth session or joining
 * it — lets the frontend show a "not found" state for a stale or mistyped board link instead of
 * connecting to (and thereby implicitly creating) a room nobody ever created via "New board". */
export async function handleGetRoom(req: Request, res: Response): Promise<void> {
  const { roomId } = req.params

  if (!isValidRoomId(roomId)) {
    res.status(400).json({ error: 'bad_request', reason: 'Invalid room id' })
    return
  }

  try {
    await liveblocks.getRoom(roomId)
  } catch (error) {
    const status = (error as { status?: number }).status
    if (status === 404) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    throw error
  }

  res.status(200).json({ id: roomId })
}
