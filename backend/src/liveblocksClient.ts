import { Liveblocks } from '@liveblocks/node'
import { env } from './env.js'

/** Single shared server-side Liveblocks client, backed by the secret key — used both to mint
 * per-room access tokens (`liveblocksAuth.ts`) and to delete rooms (`deleteRoom.ts`). */
export const liveblocks = new Liveblocks({ secret: env.liveblocksSecretKey })
