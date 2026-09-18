import { isValidRoomId } from '@crystalline/shared'
import type { Request, Response } from 'express'
import { liveblocks } from './liveblocksClient.js'

function isCreateRoomBody(body: unknown): body is { id: string } {
  if (typeof body !== 'object' || body === null) return false
  const { id } = body as Record<string, unknown>
  return typeof id === 'string'
}

/** Creates a board's Liveblocks room up front, at the moment a user deliberately hits "New
 * board" on the home page — the only place a room is allowed to come into existence (see
 * `handleGetRoom` and the existence check in `liveblocksAuth.ts`, which together stop a room
 * from being implicitly created just by visiting/joining its URL). `defaultAccesses` is
 * deliberately empty: nobody gets in without a token from `/api/liveblocks-auth`, same as every
 * other room. Initial Storage (title, empty options, etc.) is left for the frontend's
 * `RoomProvider initialStorage` to set on the creator's first connection, same as before this
 * endpoint existed. */
export async function handleCreateRoom(req: Request, res: Response): Promise<void> {
  if (!isCreateRoomBody(req.body)) {
    res.status(400).json({ error: 'bad_request', reason: 'Expected { id }' })
    return
  }

  const { id } = req.body

  if (!isValidRoomId(id)) {
    res.status(400).json({ error: 'bad_request', reason: 'Invalid room id' })
    return
  }

  try {
    await liveblocks.createRoom(id, { defaultAccesses: [] })
  } catch (error) {
    const status = (error as { status?: number }).status
    if (status === 409) {
      res.status(409).json({ error: 'conflict', reason: 'Room already exists' })
      return
    }
    throw error
  }

  res.status(201).json({ id })
}
