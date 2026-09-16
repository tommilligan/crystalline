# Excalidraw Live Collaboration System — Research Notes

Excalidraw uses a **hybrid architecture**: a lightweight Socket.IO relay server (`excalidraw-room`) for real-time message passing, plus **Firebase Firestore** as the persistent source of truth for scene state and binary files. The relay server is intentionally "dumb" — it never sees unencrypted data. All scene payloads are end-to-end encrypted with AES-GCM using a key that lives only in the URL fragment (`#room=ID,KEY`) and never reaches the server.

## Key components (client side)

| Component | Role |
|---|---|
| `Collab` (`excalidraw-app/collab/Collab.tsx`) | Orchestrator — lifecycle, reconciliation, collaborator map |
| `Portal` (`excalidraw-app/collab/Portal.tsx`) | WebSocket wrapper — opens socket, broadcasts elements/cursors, routes incoming |
| `FileManager` | Encrypts/uploads image files to Firebase Storage, fetches & decrypts on demand |
| `reconcileElements` (`packages/excalidraw/data/reconcile.ts`) | Deterministic merge of remote vs local elements |

---

## 1. Creation of the editing session

A session is created entirely client-side — the server has no concept of a room until someone connects to it.

1. The initiator calls `generateCollaborationLinkData()`, which produces two base64 strings:
   - **`roomId`** — a random public identifier (sent to the server)
   - **`roomKey`** — a secret 128-bit encryption key (stays in the URL fragment, never sent to the server)
2. The link `https://excalidraw.com/#room=ROOM_ID,KEY` is shared with collaborators.
3. `collabAPI.startCollaboration(roomId, roomKey)` is called, which:
   - Opens a Socket.IO connection to the relay server.
   - On connection, the server immediately emits `init-room` back to that socket.
   - The client then emits `join-room` with the `roomId`.

Crucially, the relay server does **not** create rooms ahead of time. A "room" is just a Socket.IO room name that comes into existence the moment the first socket joins it. There is no server-side room registry or database of rooms.

---

## 2. Adding and removing users from sessions

This is handled entirely by the relay server's `join-room` / `disconnecting` handlers (visible in `src/index.ts`).

### Joining

```js
socket.on("join-room", async (roomID) => {
  await socket.join(roomID);
  const sockets = await io.in(roomID).fetchSockets();
  if (sockets.length <= 1) {
    io.to(`${socket.id}`).emit("first-in-room");      // you're the first
  } else {
    socket.broadcast.to(roomID).emit("new-user", socket.id);  // alert others
  }
  io.in(roomID).emit("room-user-change", sockets.map(s => s.id));  // everyone gets roster
});
```

- The server adds the socket to the Socket.IO room.
- If this is the **first** user, it emits `first-in-room` — signalling the client that it must initialise the scene from Firebase (or start fresh).
- If others are present, it emits `new-user` to everyone else, which prompts one of them to send the current scene state to the newcomer (see §3).
- Every client receives `room-user-change` with the full socket-ID roster, so each client maintains its own `collaborators` map.

### Leaving / disconnecting

```js
socket.on("disconnecting", async () => {
  for (const roomID of Array.from(socket.rooms)) {
    const otherClients = (await io.in(roomID).fetchSockets())
      .filter((s) => s.id !== socket.id);
    const isFollowRoom = roomID.startsWith("follow@");
    if (!isFollowRoom && otherClients.length > 0) {
      socket.broadcast.to(roomID).emit("room-user-change", otherClients.map(s => s.id));
    }
    if (isFollowRoom && otherClients.length === 0) {
      io.to(roomID.replace("follow@", "")).emit("broadcast-unfollow");
    }
  }
});
```

On disconnect, the server re-broadcasts the updated roster to remaining clients. Clients then remove the departed user from their `collaborators` map and stop rendering their cursor. If the user was being followed, followers get `broadcast-unfollow`.

There is **no explicit "leave room" message** — removal is driven by socket disconnection. `stopCollaboration()` on the client simply closes the WebSocket, which triggers the server's `disconnecting` handler.

---

## 3. How existing state is given to a new user joining

This is a two-track process: **persistence** (Firebase) + **live peer sync**.

### Track A — Firebase (persistence, the durable source of truth)

On `first-in-room`, or for any new joiner, the client calls `loadFromFirebase`:

1. Fetches the encrypted scene document from Firestore for that `roomId`.
2. Decrypts it with the `roomKey`.
3. Runs `restoreElements` to validate/migrate the element schema.
4. Loads any referenced image files via `FileManager.getFiles()` (also encrypted at rest in Firebase Storage).
5. Seeds the local scene with `excalidrawAPI.updateScene(...)`.

So Firebase holds the last-saved snapshot of the scene, and every joiner loads it as a baseline.

### Track B — Live peer sync (the `new-user` → `INIT` flow)

When a new user joins a room that already has people in it:

1. Server emits `new-user` (with the newcomer's socket ID) to all existing clients.
2. Each existing client, on receiving `new-user`, responds by broadcasting the **full current scene** to that specific socket. The client that responds acts as the "responder" — the `Portal` packages the current elements + files, encrypts them with the room key, and emits a `server-broadcast` with subtype `INIT` directed at the new user.
3. The newcomer decrypts the `INIT` payload, reconciles it against whatever they loaded from Firebase, and renders.

This `INIT` message carries subtype `INIT` (full scene), as opposed to `UPDATE` (incremental). The relay server just forwards the encrypted blob to the target socket — it never decrypts or inspects it.

The net effect: a new user gets the **durable Firebase snapshot** plus a **fresh live snapshot from a peer**, reconciled together.

---

## 4. How updates are passed live between users

All live traffic flows through the relay server, which acts as a pure broadcast relay. There are two channels with different reliability semantics:

### Reliable channel (`server-broadcast` → `client-broadcast`)

Used for element mutations, selections, and file metadata — things that must arrive.

```js
// Server (excalidraw-room/src/index.ts)
socket.on("server-broadcast", (roomID, encryptedData, iv) => {
  socket.broadcast.to(roomID).emit("client-broadcast", encryptedData, iv);
});
```

- The sender encrypts the payload (`elements` + any `files`) with the room key + a fresh IV, emits `server-broadcast`.
- The server rebroadcasts to **all other sockets in the room** (not back to the sender).
- Each recipient decrypts, runs `reconcileElements`, and calls `updateScene`.

The payload is tagged with a subtype (`UPDATE` for incremental, `INIT` for full-scene). `UPDATE` messages carry the **full current element array** (not deltas) — reconciliation is done per-element on the receiving side, so the wire format is simple but bandwidth scales with scene size.

### Volatile channel (`server-volatile-broadcast`)

Used for transient data that's safe to drop:

```js
socket.on("server-volatile-broadcast", (roomID, encryptedData, iv) => {
  socket.volatile.broadcast.to(roomID).emit("client-broadcast", encryptedData, iv);
});
```

`socket.volatile` means Socket.IO won't buffer or retry — if the client is busy or the network drops a packet, it's gone. This carries:
- **`MOUSE_LOCATION`** — cursor coordinates (throttled to ~30fps / 33ms)
- **`IDLE_STATUS`** — active/idle/away
- **`USER_VISIBLE_SCENE_BOUNDS`** — viewport bounds for Follow Mode

### Broadcast throttling

To avoid flooding, the client throttles outgoing broadcasts:
- Element updates: sent on change, but full-scene sync is additionally triggered every **20 seconds** (`SYNC_FULL_SCENE_INTERVAL_MS = 20000`) as a safety net.
- Cursor updates: throttled to ~30fps.

### Persistence side-effect

When a client broadcasts element changes, it **also** saves to Firebase via `saveToFirebase`, which uses a Firestore transaction to reconcile-and-write atomically. This keeps the durable snapshot roughly in sync with the live state, so a late joiner (or someone joining after everyone left) sees recent edits.

---

## 5. How consistency is achieved and maintained

Excalidraw does **not** use CRDTs or operational transforms in the classic sense. It uses a **deterministic last-write-wins reconciliation** based on per-element versioning, plus periodic validation and a durable persistence layer.

### Per-element versioning

Every element carries:

```ts
{
  version: number,        // incremented on every local mutation
  versionNonce: number,   // random, regenerated on each change
  updated: number,        // epoch timestamp
  index: string,          // fractional index for z-ordering
}
```

### Reconciliation rules (`reconcileElements` + `shouldDiscardRemoteElement`)

When a remote element arrives, the local copy wins (remote is discarded) if:

1. The local element is **actively being edited** (text editing, resizing, or being created) — user intent is protected.
2. Local `version` > remote `version`.
3. Versions are equal **and** local `versionNonce` ≤ remote `versionNonce` (deterministic tiebreak — the lower nonce wins, so both clients make the same decision deterministically).

Otherwise the remote element replaces the local one. Because this rule is **deterministic and symmetric**, all clients converge on the same state given the same set of messages, even if they arrive in different orders.

### Fractional indexing for ordering

Element z-order is maintained via **fractional indices** (strings like `"a0"`, `"a1"`, `"a0.5"`), so insertions between two elements don't require re-indexing siblings. After every reconciliation:

- `orderByFractionalIndex` sorts the merged set.
- `syncInvalidIndices` repairs any duplicate or malformed indices.

### Is there periodic sync / checking?

**Yes**, at three levels:

1. **Periodic full-scene broadcast** — every 20 seconds (`SYNC_FULL_SCENE_INTERVAL_MS`), clients re-broadcast their full element set. This acts as a self-healing mechanism: any missed `UPDATE` gets corrected by the next full sync.

2. **`validateIndicesThrottled`** — runs every **60 seconds** during reconciliation. It clones the ordered elements, runs `syncInvalidIndices`, and calls `validateFractionalIndices` to detect ordering corruption. In dev/test (or when `window.DEBUG_FRACTIONAL_INDICES` is set) it throws on failure; in production it silently repairs.

3. **Firebase transaction reconciliation** — every `saveToFirebase` runs inside a Firestore `runTransaction`. It:
   - Reads the current stored (encrypted) scene.
   - Decrypts and reconciles it with the local elements using the *same* `reconcileElements` logic.
   - Writes back the merged result.

   This means the persistent store is continuously reconciled, and concurrent saves from multiple clients don't clobber each other — the transaction ensures the stored scene is always a superset of all clients' states.

4. **Tab synchronization** — for multiple tabs in the same browser, `isBrowserStorageStateNewer` (checked at `SYNC_BROWSER_TABS_TIMEOUT` intervals) detects if localStorage holds a newer scene than the current tab, triggering a merge.

### What's notably absent

- **No central operational transform server** — the relay is a dumb broadcaster.
- **No vector clocks / causal ordering** — consistency relies on the determinism of the `(version, versionNonce)` comparison, which is sufficient because the comparison is total and symmetric.
- **No locking of elements** between users — conflicts are resolved post-hoc by reconciliation. (There *is* a "collaborative locking" UI concept for multi-element lock groups, but it's an app-state feature, not a concurrency primitive.)
- **No delta/patch format on the wire** — each `UPDATE` carries the full element array; reconciliation extracts the effective diff. This is simple but means bandwidth grows with scene size, which the docs acknowledge as a performance consideration for large scenes.

---

## Summary of the end-to-end flow

| Phase | Mechanism |
|---|---|
| **Create session** | Client generates `roomId` + `roomKey`, opens Socket.IO, server auto-creates room on first `join-room` |
| **Join** | New socket joins room → `room-user-change` roster update → existing peers send `INIT` with full encrypted scene → Firebase load for durability |
| **Leave** | Socket disconnect → server rebroadcasts roster → clients prune collaborator |
| **Live updates** | `server-broadcast` (reliable) for elements; `server-volatile-broadcast` for cursors/presence — relay just forwards encrypted blobs |
| **Consistency** | Deterministic `(version, versionNonce)` last-write-wins per element + fractional indexing for order + 20s periodic full-scene rebroadcast + 60s index validation + Firebase transactional reconciliation |

The elegant part of the design is that the relay server is stateless and blind (it only ever sees ciphertext), while all the cleverness — reconciliation, conflict resolution, ordering — lives in the client and is deterministic enough that every peer converges without coordination.

---

## Sources

- [`excalidraw/excalidraw-room`](https://github.com/excalidraw/excalidraw-room) — relay server source (`src/index.ts`)
- [Excalidraw collaboration documentation](https://mintlify.wiki/excalidraw/excalidraw/concepts/collaboration) — architecture, lifecycle, encryption, WebSocket protocol
- [DeepWiki: Collaboration System](https://deepwiki.com/excalidraw/excalidraw/7-collaboration-system) — component breakdown, code references
- [DeepWiki: Real-time Synchronization](https://deepwiki.com/excalidraw/excalidraw/7.2-real-time-synchronization) — reconciliation, conflict resolution, fractional indexing, validation
- [`excalidraw-app/collab/Collab.tsx`](https://github.com/excalidraw/excalidraw/blob/master/excalidraw-app/collab/Collab.tsx) — client orchestrator
- [`excalidraw-app/collab/Portal.tsx`](https://github.com/excalidraw/excalidraw/blob/master/excalidraw-app/collab/Portal.tsx) — WebSocket wrapper
- [`packages/excalidraw/data/reconcile.ts`](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/data/reconcile.ts) — reconciliation logic
