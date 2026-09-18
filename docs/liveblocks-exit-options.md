# Liveblocks Exit Options — Self-Hosting vs. Offline-Only Mode

> **Status:** research note, not a decision or a plan. Written to capture two effort estimates
> discussed for moving off (or beside) the current Liveblocks backend, so they don't need to be
> re-derived later. See `docs/architecture.md` for how Liveblocks is used today, and
> `docs/collaborative-editing-library-architecture-options.md` for the original CRDT/backend
> comparison that led to choosing Liveblocks + Yjs.

Two different questions were scoped:

1. Replace the Liveblocks backend entirely with self-hosted Yjs infrastructure, keeping today's
   real-time multiplayer.
2. Add a second, offline-only mode backed by local storage, alongside (not instead of) Liveblocks.

They turn out to have very different cost profiles, for the same underlying reason: **Liveblocks
Storage (`LiveObject`/`LiveList`) is a proprietary CRDT model, not Yjs.** Only the free-text
fields (already routed through `@liveblocks/yjs`) are Yjs-native today. Anything that needs to
keep multiplayer conflict resolution has to reckon with that; offline-only mode doesn't, because
a single device needs no CRDT at all.

## Current Liveblocks surface (baseline for both estimates)

Three distinct capabilities, not one:

1. **Structured board state** — Liveblocks Storage, read via `useStorage` (10 call sites) and
   written via 20 mutation hooks in `frontend/src/hooks/useBoardMutations.ts` (`useMutation`).
2. **Free-text fields** — Yjs-native already, via `LiveblocksYjsProvider` wrapping a `Y.Doc`,
   bound to TipTap through `y-prosemirror` (`frontend/src/liveblocks-yjs/YjsRoomProvider.tsx`).
3. **Presence** — `useOthers`/`useSelf`/`useUpdateMyPresence` for avatars/identity, plus
   Liveblocks' automatic token refresh.

Backend-side, `@liveblocks/node` mints room-scoped tokens (`backend/src/liveblocksAuth.ts`) and
does room CRUD (`createRoom.ts`, `getRoom.ts`, `deleteRoom.ts`, `scripts/manage-rooms.ts`)
against Liveblocks' hosted REST API. There is no persistence of our own anywhere in the stack
today — Liveblocks owns all of it.

## Option A — Self-host a standard Yjs backend (e.g. Hocuspocus)

Replaces Liveblocks outright; multiplayer stays.

The Yjs text-field swap itself is cheap — `LiveblocksYjsProvider` → `HocuspocusProvider` is a
same-shape `Y.Doc`/TipTap change. The expensive part is Storage: it has no Yjs equivalent to port,
so the whole board schema has to be re-modelled as Yjs shared types (`Y.Map`/`Y.Array`), with
custom `useSyncExternalStore`-based React bindings written to replace `useStorage`'s selector
ergonomics (or an adopted helper library adapted to fit). Liveblocks' storage history/undo also
has no free equivalent — `Y.UndoManager` would need wiring up if that's wanted.

| Piece | Work | Rough effort |
|---|---|---|
| Storage → Yjs shared types + React bindings | Re-model schema, rewrite 20 mutation hooks + 10 `useStorage` reads across ~8 column components, add undo if wanted | 3–4 days |
| Text fields: `LiveblocksYjsProvider` → `HocuspocusProvider` | Same `Y.Doc`/TipTap wiring, swap provider + connection/auth | 0.5–1 day |
| Presence/awareness | Replace Liveblocks presence with Yjs awareness protocol + custom hooks for avatars/identity | 0.5–1 day |
| Backend: auth + room lifecycle | Replace token minting with Hocuspocus `onAuthenticate` hook; reimplement "room only exists if explicitly created" (needs our own room-metadata store — Hocuspocus has no such concept) | 1–2 days |
| Persistence | Wire a Hocuspocus persistence extension (Postgres/SQLite/Redis) for the Yjs docs; decide whether structured state and text share one doc per room or two | 0.5–1 day |
| Admin tooling | Rewrite `manage-rooms.ts` (list/delete) against our own DB instead of `iterRooms`/`getStorageDocument` | 0.5 day |
| Deploy & ops | Stand up the Hocuspocus WS server + DB, TLS/WSS termination, process management, horizontal-scaling story (Hocuspocus's Redis extension), backups, monitoring — all currently free from Liveblocks | 1–3 days, infra-dependent |
| Verification | Multiplayer conflict testing, update `run-app.sh`/smoke test env, cross-browser presence check | 0.5–1 day |

**Total: roughly 8–14 developer-days (~2–3 weeks)**, for an engineer already comfortable with Yjs
(true here, from the existing text-field work) but new to Hocuspocus and to running the ops side
in-house. The dominant cost is rebuilding Storage's structured-state ergonomics on raw Yjs, plus
taking on infra/ops currently free.

## Option B — Add an offline-only mode (local storage, no backend)

Additive, not a replacement. Cheaper than Option A because offline-only means single device, no
concurrent editors — no CRDT is actually needed for that mode, just a JSON blob read/written
locally. The real cost is architectural: supporting **two backends behind one set of hooks**
without doubling the maintenance surface forever.

Two existing couplings make this non-trivial:

1. **The domain schema type is Liveblocks-shaped.** `Storage` in `frontend/src/liveblocks.config.ts`
   declares fields as `LiveList<LiveObject<OptionData>>` directly — the wire type *is* the domain
   type. A local backend has no `LiveObject`, so the domain type needs decoupling first: plain
   `OptionData[]` etc., with the Liveblocks adapter as the only place that wraps/unwraps
   `LiveObject`/`LiveList`. Mechanical, but touches all 20 mutation hooks and 10 `useStorage`
   call sites.
2. **`boardsRegistry` is documented as "pointer/cache, never source of truth"**
   (`docs/architecture.md`) — deliberately, since Liveblocks is the real record. An offline board
   has no other record, so local storage necessarily becomes authoritative *for that board only*.
   That's an inversion of a stated invariant, not just an implementation detail — needs a clear
   way to tag which mode a given board is in (e.g. a `mode` field per registry entry, or a
   prefixed board id), so nothing accidentally treats a local board as if a server copy exists
   (export/share-link copy, delete-confirmation copy, etc. all currently assume one).

| Piece | Work | Rough effort |
|---|---|---|
| Decouple domain types from `LiveObject`/`LiveList` | Plain types in `types/board.ts`; Liveblocks adapter wraps/unwraps at the edges | 0.5–1 day |
| Storage abstraction | `useBoardState`/mutation hooks work against an interface, not `liveblocks.config.ts` directly; existing Liveblocks hooks become one implementation of it | 1 day |
| Local backend implementation | Plain state + debounced `localStorage` (or IndexedDB for headroom past ~5MB) writes, no network, no auth | 1 day |
| Text fields for local mode | Skip Yjs/TipTap-collab entirely — plain local TipTap doc (or a plain textarea), stored as a field in the same JSON blob | 0.5 day |
| Board creation/routing + registry semantics | Tag local vs. Liveblocks boards; skip `POST /api/rooms`/auth entirely for local; adjust not-found/delete/export flows per mode | 1 day |
| Hide presence UI, branch export view | `PresenceAvatars` and room-existence checks no-op for local boards | 0.5 day |
| Testing | Unit tests for local mutation hooks; smoke test needs a second (no-backend) path | 0.5–1 day |

**Total: roughly 5–6 developer-days** — less than Option A, since real-time sync isn't being
rebuilt, just added as a second, simpler backend.

### The real cost isn't the build — it's the ongoing tax

Once a storage abstraction with two implementations exists, **every future board feature (new
field, new mutation) has to be implemented and tested against both backends**, or the app
silently diverges by mode. That's the durable architectural cost, not the one-time branch. Worth
deciding up front, before building this: is offline-only meant to have full feature parity with
the multiplayer mode forever, or is it allowed to be a deliberately reduced subset (e.g. no
rating-properties customization, no next-steps)? That call changes the ongoing cost more than
anything in the table above.

## Bottom line

- **Option A** (self-hosted Yjs, replacing Liveblocks): ~8–14 days, mostly rebuilding Storage's
  structured-state layer plus taking on infra/ops Liveblocks currently provides for free.
- **Option B** (offline-only mode, alongside Liveblocks): ~5–6 days up front, but commits the
  project to maintaining two backends in lockstep for every future board feature unless
  offline mode is scoped as an intentionally reduced subset.

Neither has been started; no decision has been made between them or to do neither.
