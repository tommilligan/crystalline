import cors from 'cors'
import express from 'express'
import { handleCreateRoom } from './createRoom.js'
import { handleDeleteRoom } from './deleteRoom.js'
import { env } from './env.js'
import { handleGetRoom } from './getRoom.js'
import { handleLiveblocksAuth } from './liveblocksAuth.js'
import {
  liveblocksAuthRateLimit,
  roomCreateRateLimit,
  roomDeleteRateLimit,
  roomLookupRateLimit,
} from './rateLimit.js'

const app = express()

app.use(cors({ origin: env.corsOrigins }))
app.use(express.json())

app.post('/api/liveblocks-auth', liveblocksAuthRateLimit, (req, res, next) => {
  handleLiveblocksAuth(req, res).catch(next)
})

app.post('/api/rooms', roomCreateRateLimit, (req, res, next) => {
  handleCreateRoom(req, res).catch(next)
})

app.get('/api/rooms/:roomId', roomLookupRateLimit, (req, res, next) => {
  handleGetRoom(req, res).catch(next)
})

app.delete('/api/rooms/:roomId', roomDeleteRateLimit, (req, res, next) => {
  handleDeleteRoom(req, res).catch(next)
})

app.get('/healthz', (_req, res) => {
  res.status(200).send('ok')
})

app.listen(env.port, () => {
  console.log(`crystalline backend listening on :${env.port}`)
})
