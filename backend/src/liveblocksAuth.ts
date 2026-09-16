import { isValidRoomId, type LiveblocksAuthRequest } from '@crystalline/shared'
import type { Request, Response } from 'express'
import { liveblocks } from './liveblocksClient.js'

function isAuthRequestBody(body: unknown): body is LiveblocksAuthRequest {
  if (typeof body !== 'object' || body === null) return false
  const { room, userId, userInfo } = body as Record<string, unknown>
  if (typeof room !== 'string' || typeof userId !== 'string') return false
  if (typeof userInfo !== 'object' || userInfo === null) return false
  const { name, color } = userInfo as Record<string, unknown>
  return typeof name === 'string' && typeof color === 'string'
}

/** Mints a short-lived Liveblocks access token scoped to a single room.
 *
 * There are no real user accounts in the MVP (see `docs/mvp-scope.md`), so `userId` is a
 * per-browser id the frontend generates itself, not something this endpoint authenticates
 * against a user store. What this endpoint *does* guard is the thing that actually needs
 * guarding: the Liveblocks secret key, and (via `liveblocksAuthRateLimit`) how fast a client
 * can spend it. When real accounts exist, this is the one place that needs to change — swap
 * the trusted `userId`/`userInfo` from the request body for values derived from a verified
 * session, and narrow `.allow(...)` per user/role instead of granting every caller full access. */
export async function handleLiveblocksAuth(req: Request, res: Response): Promise<void> {
  if (!isAuthRequestBody(req.body)) {
    res.status(400).json({ error: 'bad_request', reason: 'Expected { room, userId, userInfo }' })
    return
  }

  const { room, userId, userInfo } = req.body

  if (!isValidRoomId(room)) {
    res.status(400).json({ error: 'bad_request', reason: 'Invalid room id' })
    return
  }

  const session = liveblocks.prepareSession(userId, { userInfo })
  session.allow(room, ['*:write'])

  const { status, body } = await session.authorize()
  res.status(status).type('application/json').send(body)
}
