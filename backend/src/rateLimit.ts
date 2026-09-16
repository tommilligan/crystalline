import rateLimit from 'express-rate-limit'

/** Guards the Liveblocks auth endpoint, which is the one place this service spends its secret
 * key. This is deliberately generous (the frontend re-authorizes on every room join/reconnect,
 * plus Liveblocks itself refreshes the token before expiry) — it exists to bound abuse, not to
 * enforce per-user quotas. In-memory, per-instance only: fine for a single backend process; if
 * this service is ever scaled horizontally, swap the store for a shared one (e.g. Redis) so
 * limits apply across instances. */
export const liveblocksAuthRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
})

/** Guards the room-deletion endpoint. Tighter than the auth rate limit above since this is a
 * destructive action a user should only be hitting occasionally, not on every room join. */
export const roomDeleteRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

/** Guards the room-creation endpoint. Same shape as the delete limit above — a user should only
 * be hitting "New board" occasionally, not on every board open. */
export const roomCreateRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

/** Guards the room-existence-check endpoint. As generous as the auth rate limit since the
 * frontend calls this every time a board link is opened, same cadence as auth itself. */
export const roomLookupRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
})
