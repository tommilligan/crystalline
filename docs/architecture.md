# Architecture

How Crystal Ball is actually built, as of the current codebase. This describes the
**implementation** — for the original methodology and design rationale, see the docs linked
from `docs/README.md`. Several of those docs describe decisions that were later superseded during
implementation; see "Divergences from the spec docs" at the end of this file.

## Repo shape

An npm workspaces monorepo:

```
frontend/         React 19 + Vite SPA (Mantine UI) — the whole product surface
backend/          Express API — room lifecycle + Liveblocks auth, nothing else
packages/shared/  Types/validation shared across the frontend/backend boundary
docs/             Spec + research docs (see docs/README.md's reading order)
design/           Early visual-design brief (Figma prompt + first-pass screenshot)
scripts/          run-app.sh (dev servers + smoke test) and smoke-test.mjs (Playwright)
assets/           The original physical-whiteboard example this tool is modeled on
```

TypeScript everywhere, project-referenced per workspace (`tsc -b`). Biome (single root config,
`biome.json`) handles both lint and format across all workspaces. There is no shared runtime
code path between frontend and backend beyond `packages/shared` — they're separate processes
that only agree on wire types.

## Where state lives

State is split across four places, each deliberately narrow in scope:

1. **Liveblocks Storage** (`frontend/src/liveblocks.config.ts`, `Storage` type) — the shared,
   structured board data: title, lifecycle state, the options list, rating properties, the
   decision record, and `situationAgreed`. Mutated only through the
   `use*` hooks in `frontend/src/hooks/useBoardMutations.ts`, which call Liveblocks'
   `useMutation`. Liveblocks' own storage history and multiplayer conflict resolution is what
   makes this safe with concurrent writers — see "Divergences" below for why this replaced the
   event-sourced design in `docs/event-schema.md`.

2. **A Yjs document per room, synced via `@liveblocks/yjs`** (`frontend/src/liveblocks-yjs/`) —
   every free-text field (situation statement, each option's idea/enabler/blocker, the
   decision's countermeasure/dissent) is a `Y.XmlFragment` edited through a TipTap editor
   (`CollaborativeTextField.tsx`). One `Y.Doc` + `LiveblocksYjsProvider` pair is created per
   room by `YjsRoomProvider` and shared by every text field in it; each field addresses its own
   fragment by a stable string key from the `option*Field()` helpers in `types/board.ts`. This
   is a deliberate split from Storage: Yjs gives per-keystroke CRDT merging for text, which
   `LiveObject`/`LiveList` don't need for scalar/structured fields.

3. **Per-viewer local React state** — which phase/column is currently focused
   (`BoardView.tsx`'s `useState<Phase>`) is intentionally *not* synced. One participant clicking
   into a different column must not drag everyone else's view along with them. This is the one
   piece of board-shaped state that never touches the network. (See
   `[[feedback_focus_state_not_shared]]` in this account's memory — this exact rule has bitten
   the project before.)

4. **`localStorage`, client-side only** — `frontend/src/lib/localIdentity.ts` (a per-browser
   display name/colour used as Liveblocks presence) and `frontend/src/lib/boardsRegistry.ts`
   (the "my boards" list on the home page). Both are pointers/caches, never sources of truth:
   Liveblocks has no "list rooms" API on the public client key, so the registry is what powers
   the home page list, but the room itself is still the only real record of a board's content —
   opening a board link on a device that's never seen it before works fine with an empty
   registry.

## Room lifecycle & auth

No real user accounts (still true to `docs/mvp-scope.md` on this point) — identity is just a
per-browser id plus a display name/colour. What the backend actually guards:

- **A room only exists once explicitly created.** `POST /api/rooms` (`backend/src/createRoom.ts`)
  is the *only* path that creates a Liveblocks room, called once from the "New board" flow
  before navigating there. Liveblocks would otherwise auto-create a room on first connection for
  any room id a valid token names, so both `GET /api/rooms/:id` (existence check before joining)
  and `POST /api/liveblocks-auth` (token minting) explicitly check the room exists first and
  404 if not — visiting a stale/mistyped board link shows "not found" instead of silently
  creating an empty room.
- **The Liveblocks secret key never reaches the client.** `POST /api/liveblocks-auth`
  (`backend/src/liveblocksAuth.ts`) mints a short-lived, room-scoped access token from the
  client-supplied `userId`/`userInfo`; the frontend's `liveblocks.config.ts` calls it as
  Liveblocks' `authEndpoint`. There's no session to verify against yet — see the doc comment on
  `handleLiveblocksAuth` for exactly what changes here once real accounts exist.
- All four endpoints are individually rate-limited (`backend/src/rateLimit.ts`).
- `DELETE /api/rooms/:id` deletes the room outright (the real board data, not just a device's
  local registry entry) — anyone with a room id can delete it, gated only by a confirmation
  dialog in the UI, same "no real accounts" tradeoff as everywhere else in MVP.
- `backend/src/scripts/manage-rooms.ts` (`npm run manage-rooms -w backend`) is a separate
  operator CLI for listing/deleting rooms directly against the Liveblocks project using the
  secret key — not part of the app itself.

## Frontend structure

- **Routing** (`react-router-dom`): `/` (`HomePage` — the local boards list + "New board"),
  `/board/:boardId` (`BoardPage`), `/board/:boardId/export` (`ExportPage`).
- **Board phases**: `situation → ideation → evaluation → decision` (`types/board.ts`'s `PHASES`)
  — four phases, not five; see "Divergences" below. `BoardView.tsx` owns phase focus and renders
  all four columns simultaneously (`BoardLayout.tsx`), each column gated by `active`/`disabled`
  props rather than being mounted/unmounted.
- **Hooks layer** (`frontend/src/hooks/`): `useBoardState.ts` (typed Storage reads),
  `useBoardMutations.ts` (typed Storage writes), `useBoardsRegistry.ts` (the local boards list,
  via React Query), `useRoomExists.ts`, `useColumnHasData.ts` (drives "resume where you left
  off"), `useOptionWalkthrough.ts`, `useLocalIdentity.ts`.
- **Export view** (`components/export/`) is its own route, not a mode toggle inside `BoardPage`
  — it joins the same Liveblocks room read-only, with its own print stylesheet and no board
  chrome, so it can be opened in a new tab or driven headlessly independent of the interactive
  board.
- **UI kit**: Mantine (core/dates/hooks/notifications) + Tabler icons.

## Testing & dev workflow

- `npm run dev` (root) — runs frontend + backend dev servers concurrently.
- `npm run typecheck` / `npm run build` (root) — run in dependency order: `packages/shared` →
  `backend` → `frontend`.
- `npm run lint` / `npm run format` (root) — Biome, whole repo.
- `npm run test -w frontend` — Vitest unit tests (`frontend/src/**/*.test.ts`).
- **`scripts/run-app.sh`** — starts both dev servers, waits for health checks, then drives the
  full four-phase board flow through a real headless browser
  (`scripts/smoke-test.mjs`, Playwright) and tears the servers down. This is the "does the app
  actually work" check that `tsc`/unit tests can't give — reach for it (rather than re-deriving
  the start/wait/drive/teardown dance by hand) whenever a change should be verified against the
  running app. `--keep` leaves servers up for manual poking at `http://localhost:5173`;
  `--no-smoke` skips the browser walk. Requires `backend/.env` (copy from
  `backend/.env.example`, needs a real `LIVEBLOCKS_SECRET_KEY`). Logs/screenshots land in
  `scripts/.run-app.local/` (gitignored).

## Divergences from the spec docs

The docs linked from `docs/README.md` capture the original design and its reasoning, and are still
the right place to understand *why* the tool works the way it does. But a few things were
resolved differently once real implementation started, and those docs haven't been rewritten to
match (each affected doc has a short status note added at the top pointing here):

- **Multiplayer is built, not deferred.** `docs/mvp-scope.md` scopes multiplayer as an
  explicitly deferred feature and describes a single-device, no-network MVP. The actual MVP is a
  live Liveblocks-backed multiplayer app from the start (see "Room lifecycle & auth" above) —
  this turned out to be roughly as cheap as building single-device persistence from scratch once
  Liveblocks was chosen as the backend (see
  `docs/collaborative-editing-library-architecture-options.md`), so it was built directly rather
  than staged.
- **No event-sourced log.** `docs/event-schema.md` specifies an append-only local event log that
  board state is folded from. The implementation instead mutates Liveblocks Storage directly
  (`useBoardMutations.ts`) — Liveblocks' own storage history/undo and multiplayer conflict
  resolution now provide what the local event log was designed to provide for a single-device
  MVP, so the extra indirection wasn't needed. See the doc comment at the top of
  `useBoardMutations.ts`.
- **Four phases, not five.** `docs/phases.md` and `docs/data-model.md` specify a five-phase
  board with `evaluation` (Enabler/Blocker) and `scoring` (the six numeric ratings) as separate
  phases. The implementation merges them into one `evaluation` phase/column
  (`components/board/columns/EvaluationColumn.tsx`) — enabler/blocker and scores are edited
  together per option rather than in two passes.
- **Rating properties are configurable, not fixed.** The spec's People/Time/Money/Quality/
  Service/Price six dimensions are still the seeded default (`DEFAULT_RATING_PROPERTIES`), but
  the implementation lets a team rename/add/remove them per board
  (`RatingPropertiesPicker.tsx`), rather than hard-coding the six.
- **Export is an HTML/print route, not a PNG capture.** `docs/ui-notes.md` and
  `docs/mvp-scope.md` describe PNG export. The implementation is a dedicated printable page at
  `/board/:id/export` (browser print-to-PDF covers the same need).
- **Clone is not implemented.** Referenced throughout `docs/mvp-scope.md` and `docs/data-model.md`
  as an in-scope MVP action; the signed-board UI currently shows a disabled "Clone Board" button
  ("Not implemented in this scaffold").
- **Un-signing exists, but only as a dev-only escape hatch.** `docs/mvp-scope.md` states
  un-signing is "not planned at all." A `useUnsignBoard` mutation exists purely so a developer
  can reuse one room across repeated manual test runs instead of creating a fresh one each time
  — it's gated behind `import.meta.env.DEV` and never exposed in production; see its doc
  comment in `useBoardMutations.ts`.
- **No template concept.** `docs/data-model.md` and `docs/mvp-scope.md` frame board creation as
  always "from template," with a single standard template in MVP and room for custom templates
  later. The implementation dropped this framing entirely — "New board" just creates a board
  directly (`HomePage.tsx`), with no template selection UI. The underlying idea may return later
  as a narrower concept (e.g. a reusable set of rating properties), but there's no template
  entity or picker today.
