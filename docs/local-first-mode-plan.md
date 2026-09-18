# Local-First Mode — Technical Plan

> **Status:** agreed technical plan, not yet built. Supersedes Option B in
> `docs/liveblocks-exit-options.md` with a different (better, once worked through) shape for the
> storage model — see "Why not Option B as written" below. See `docs/architecture.md` for how
> Liveblocks is used today.

## Goal

When creating a board, choose **local-only** (default everywhere, no backend involved at all) or
**sharable** (today's Liveblocks multiplayer board; dev-only for now, not offered in production).

The app should speak one **abstract, portable CRDT data model** — Yjs shared types (`Y.Doc`/
`Y.Map`/`Y.Array`/`Y.XmlFragment`), not Liveblocks' proprietary `LiveObject`/`LiveList` — for
*all* board state, structured fields included, not just free text as today. Liveblocks becomes
purely one of two interchangeable **transports/persistence backends** for that same `Y.Doc`:

- **Sharable mode**: the `Y.Doc` is synced over the network via `LiveblocksYjsProvider` (exactly
  the mechanism already used for text fields today).
- **Local-only mode**: the same `Y.Doc` is persisted to IndexedDB on this device only, no network,
  no backend calls, no Liveblocks project involved.

Because both modes share one CRDT model, **every mutation/read hook is written once** and works
identically in both modes — the thing that made Option B's "two backends forever" tax expensive.
Only the thin provider layer underneath the shared `Y.Doc` context differs per mode.

## Decisions made (recap)

Agreed while scoping this plan — recorded here so they don't need re-deriving:

- **Full migration**, not a converter layer: replace Liveblocks' native `LiveObject`/`LiveList`
  Storage with Yjs `Y.Map`/`Y.Array` for structured fields, using Yjs's own native support for
  JSON-serializable values (booleans, numbers, strings, nested maps/arrays) rather than overloading
  `Y.Text`/`Y.XmlFragment` for anything that isn't free text. See
  [Yjs: Working with Shared Types](https://docs.yjs.dev/getting-started/working-with-shared-types).
- **Zod** validates data read out of Yjs's untyped `Y.Map`s at the hook boundary, and doubles as
  the backend request-validation library (already wanted independently of this project).
- **No existing room data needs preserving** — nothing in the repo suggests real boards exist yet,
  so no migration script for old-format rooms is needed. (Re-verify this assumption immediately
  before deleting/ignoring any real Liveblocks project data, if one has since been created.)
- **No undo/redo, no server-side storage introspection** — both explicitly out of scope. Liveblocks
  Storage gave these for free; going full-Yjs means giving them up unless built separately later.
  Not needed today.
- **Local-only aims for full feature parity forever**, except features that are inherently
  multiplayer-only (avatars/presence, collaboration cursors, share-by-link). Every future board
  feature should be built once against the shared model, not per-mode.

### Why not Option B (from `docs/liveblocks-exit-options.md`) as written

Option B assumed local-only mode would use a plain JSON blob (no CRDT), decoupled from
`LiveObject`/`LiveList` via a converter layer, while sharable mode kept native Storage untouched.
That's lower-risk (zero change to the working multiplayer path) but commits the project to
maintaining **two real implementations of every mutation hook forever** — its own documented "real
cost." Since the domain data is small and the app already has a working Yjs pipeline for text,
unifying everything onto Yjs instead removes that duplication entirely, at the one-time cost of
rewriting the currently-working structured-storage path too. Confirmed acceptable since there's no
real data at stake yet.

## Architecture

### 1. One `Y.Doc` per board, one schema

Today there are *two* storage mechanisms per room: native Storage (`liveblocks.config.ts`'s
`Storage` type, structured fields) and a separate `Y.Doc` (`YjsRoomProvider`, text fragments only).
These merge into one `Y.Doc`.

**Guiding rule: no field holds a JSON blob that a whole-value overwrite would clobber if two
people edit different parts of it concurrently.** Every collection is a real Yjs collection type
(`Y.Array`/`Y.Map`), all the way down, so concurrent edits merge at the level people actually edit
independently — a whole option, a single next-step row, a single rating property, a single score.
The one place the first draft of this plan got this wrong is called out below.

**Text fragments are nested inside the record they belong to, not kept as a separate flat
top-level namespace.** Today's flat scheme (`option-text-{id}`, `option-enabler-{id}`,
`decision-countermeasure`, etc. — top-level `Y.XmlFragment`s addressed by an id-derived string key)
has a real bug worth fixing while breaking compatibility is free: deleting an option
(`useRemoveIdea`) only removes its entry from the `options` array — the option's text fragments
stay behind forever as orphaned top-level shared types, since nothing in Yjs ties a top-level
name's lifetime to whether some id-derived string still "means" anything. Over a board's lifetime
of adding/removing options, that's unbounded growth in the persisted doc (worse for local-only
mode, which serializes the whole doc to IndexedDB on every write).

Fix: each text field lives as a **direct sibling value inside its owning record's own `Y.Map`** —
`option.get('idea')` next to `option.get('id')`/`option.get('scores')` — not a separate `content`
sub-bucket (one level of nesting, not two; there's no benefit to the extra layer). Deleting the
option's array entry now correctly reclaims its text content along with the rest of the record,
since Yjs's garbage collection reclaims anything that becomes unreferenced when its containing
type is removed. This is supported directly by the library already in use here — confirmed against
the installed `@tiptap/extension-collaboration` (`^3.31.3`) types: `Collaboration.configure`
accepts a `fragment: Y.XmlFragment` option ("a raw Y.js fragment, can be used instead of `document`
and `field`"), specifically for binding to a fragment that lives somewhere other than a top-level
doc key.

Structured collections follow the same top-level-named-collection convention as before (each is
its own `doc.getMap(name)`/`doc.getArray(name)`, not one giant root map) — nesting only applies
*within* a record for fields that conceptually belong to it.

#### Full data model

| Doc key (top-level shared type) | Yjs type | Contents | Concurrency granularity |
|---|---|---|---|
| `meta` | `Y.Map` | `title: string`, `lifecycleState: 'active'\|'signed'`, `signedAt: string\|null`, `nextStepsCommitted: boolean`, `nextStepsCommittedAt: string\|null`, `situationAgreed: boolean`, `situation: Y.XmlFragment` (the problem-statement text — board-level, not owned by any array record) | Per key — `Y.Map` merges independently per key, so e.g. one person renaming the board and another toggling `situationAgreed` at the same moment never conflict, even sharing one map. |
| `options` | `Y.Array<Y.Map>` | one `Y.Map` per option: `id: string`, `createdAt: number`, `scores: Y.Map<propertyId, number>` (see below), `idea: Y.XmlFragment`, `enabler: Y.XmlFragment`, `blocker: Y.XmlFragment` | Per option — array insert/delete merges without clobbering concurrent inserts elsewhere in the list; deleting an option removes its text content with it (no orphaned fragments). |
| — each option's `scores` | `Y.Map<string, number>` | keyed by `RatingProperty.id` | **Per rating property** — this is the fix from the previous revision: two people scoring *different* properties on the *same* option at the same time each keep their write, because each property is its own map key, not a field inside one merged object. |
| `ratingProperties` | `Y.Array<Y.Map>` | one `Y.Map` per property: `id: string`, `label: string` | Per property — adding/removing/renaming one property doesn't touch another's entry. |
| `decision` | `Y.Map` | `chosenOptionId: string\|null`, `approvedBy: string\|null`, `date: string\|null`, `agreement: Agreement\|null`, `countermeasure: Y.XmlFragment`, `dissent: Y.XmlFragment` | Per key — matches today's per-field `LiveObject.set` semantics exactly. `decision` is a singleton, never deleted, so nesting here is for colocation/consistency rather than fixing a leak. |
| `nextSteps` | `Y.Array<Y.Map>` | one `Y.Map` per row: `id: string`, `action: string`, `owner: string`, `dueDate: string\|null` | Per row and per field within a row — two people editing different rows, or different fields of the same row, don't conflict. No text fragments today (`action`/`owner` are plain inputs, not TipTap) — if a future feature adds rich text here, nest it the same way `options` does, for the same reason. |
| `timer` | `Y.Map` | `status`, `durationMs`, `remainingMs`, `endsAt` | Per key. |

There is no longer a separate flat namespace of text-field keys — `optionTextField(id)`,
`optionEnablerField(id)`, `optionBlockerField(id)`, `SITUATION_FIELD`, `COUNTERMEASURE_FIELD`, and
`DISSENT_FIELD` (`types/board.ts`) are all retired; every field, text or structured, lives inside
the `Y.Map`/`Y.Array` of the entity it belongs to.

Two deliberate exceptions that stay as plain scalar values rather than being decomposed further,
because there's no sub-field to split — a rename, a status flip, or a single score is already
atomic at the level someone actually edits it:

- A rating property's `label` and a next-step's `action`/`owner` are plain strings, not
  `Y.XmlFragment`s — they're edited via plain inputs today (not TipTap), so a concurrent edit to
  the exact same field of the exact same row is last-write-wins, matching current behavior
  precisely (`LiveObject.set('label', ...)` was never more granular than this either).
- Enum/scalar fields (`lifecycleState`, `status`, a single score value) are single atomic values —
  decomposing "sub-fields" of a string enum or a number wouldn't mean anything.

**Consequence for `CollaborativeTextField` and record creation.** Two knock-on changes from
nesting fragments, called out explicitly since they're real (if modest) added complexity, not
free:

- `CollaborativeTextField`'s prop changes from `field: string` (a name it could derive standalone
  from an id) to `fragment: Y.XmlFragment` (a live object the caller must already have in hand,
  since a fragment nested inside a record can't be located from an id alone the way a top-level
  name could be). Callers get it from the option/decision record they're already rendering — e.g.
  an `OptionCard` already has its `OptionData`-shaped record in scope and now also needs the
  underlying `Y.Map` (or a small accessor hook that finds it) to pull out `.get('idea')`.
- A record's `Y.XmlFragment` values must be constructed **at record-creation time**, inside the
  same `doc.transact()` that builds the rest of the record — e.g. `useAddIdea` now does
  `optionMap.set('idea', new Y.XmlFragment())` (and same for `enabler`/`blocker`) before pushing
  the map into `options`, rather than relying on a fragment springing into existence the first time
  some component asks for it by name (today's `doc.getXmlFragment(field)` auto-vivifies on first
  access; a nested value doesn't have that behavior, since it isn't a named doc-level lookup).

`initialStorage()` in `liveblocks.config.ts` (renamed — see below) becomes a function that
populates a fresh `Y.Doc` with this shape, used identically by both modes.

### 2. Zod schemas as the typed domain layer

Every plain-value shape above (`RatingProperty`, an option's non-text fields, `DecisionData`,
`NextStepData`, `TimerState`) gets a matching Zod schema. These:

- Replace the current hand-written TS types in `types/board.ts` as the source of truth (`z.infer`
  gives back the same types), or sit alongside them if `types/board.ts`'s other helpers
  (`totalScore`, `optionDisplayId`, etc.) are kept as-is — either works, prefer schema-as-source to
  avoid two definitions drifting.
- Validate **per collection/record, not the whole document at once** — one schema for an option,
  one for a next-step row, one for `meta`, etc. — mirroring the doc's own per-collection
  granularity, so a read hook only re-validates (and only re-renders on) the slice of state it
  actually reads, and a corrupted single record doesn't invalidate the rest of the board. Each
  schema only covers that record's plain-value fields — a nested `Y.XmlFragment`/`Y.Map` isn't
  itself passed through Zod (it's a live binding, not domain data with a shape to validate); the
  read-hook layer strips those keys out before validating and returns the live fragment references
  alongside the validated plain values.
- Likely belong in `packages/shared` so the backend can reuse the same library/patterns for its own
  request validation (`createRoom.ts`, `liveblocksAuth.ts`) — separate piece of work, same
  dependency.

New dependency: `zod` (frontend, and backend if adopted there too).

### 3. Provider abstraction: one `Y.Doc` context, two backends

`YjsRoomProvider` (`frontend/src/liveblocks-yjs/YjsRoomProvider.tsx`) generalizes into a
mode-agnostic `BoardDocProvider` exposing the same `{ doc: Y.Doc, synced: boolean }` context both
today's consumers (`CollaborativeTextField`, the rewritten mutation/read hooks) already expect:

- **Sharable backend**: unchanged mechanism — `new LiveblocksYjsProvider(room, doc)` inside a
  `RoomProvider`, as today.
- **Local backend** (new): on mount, open an IndexedDB database for this board id, load any
  persisted update into a fresh `Y.Doc` via `Y.applyUpdate`, mark `synced: true` once loaded.
  Subscribe to `doc.on('update')` and debounce-write `Y.encodeStateAsUpdate(doc)` back to
  IndexedDB (compacting to a single full-state blob each write, not an ever-growing update log —
  Yjs's incremental update format is for network transport, not what should accumulate at rest).

Neither backend needs `LiveObject`/`LiveList` or Liveblocks' Storage APIs at all going forward —
sharable mode uses Liveblocks purely as a transport for an opaque Yjs binary, same as text fields
do today.

### 4. Mutation/read hooks rewritten against `Y.Doc`, once

`useBoardMutations.ts`'s 20 hooks and `useBoardState.ts`'s 10 hooks stop depending on
`liveblocks.config.ts`'s `useMutation`/`useStorage` and instead operate on the `Y.Doc` from the
provider context above:

- **Mutations**: wrap each edit in `doc.transact(() => { ... })` (Yjs's equivalent of a single
  Liveblocks mutation callback — batches the resulting update into one event/persisted write).
  Body logic is nearly copy-shape identical to today (e.g. `useAddIdea` still constructs a fresh
  record and pushes it), just against `Y.Map`/`Y.Array` methods (`.set`, `.push`, `.delete`,
  `.get`) instead of `LiveObject`/`LiveList` methods — the API shapes are close enough that this is
  mechanical per-hook, not a redesign. `useSetScore` is the one hook that gets simpler, not just
  ported — today it must read-modify-write the whole `scores` object
  (`option.set('scores', { ...current, [propertyId]: value })`) specifically to avoid clobbering
  other properties; with `scores` as its own `Y.Map`, it's just
  `option.get('scores').set(propertyId, value)`, and the no-clobber guarantee comes from the data
  model instead of from hook-level care.
- **Reads**: `useSyncExternalStore`-based selector hooks subscribing to the relevant map/array's
  `observe`/`observeDeep`, re-deriving a plain JS value (validated through the matching Zod schema)
  on each notification — replacing `useStorage(selector, shallow)`. This is genuinely new code (no
  Liveblocks equivalent to lean on), the single biggest net-new piece of this plan.

### 5. Board mode: registry, creation, routing

- `BoardSummary` (`types/board.ts`) gains a `mode: 'local' | 'shared'` field, persisted by
  `boardsRegistry.ts` — this device's local index is exactly where a per-board mode tag belongs,
  since it already exists solely as a local pointer/cache.
- **New Board modal** (`HomePage.tsx`): a mode selector, visible only under
  `import.meta.env.DEV` (same gating pattern as `useUnsignBoard`), defaulting to (and hard-coded to,
  outside dev) `'local'`.
- **`useCreateBoard`**: branches on mode.
  - `'local'`: skip `createBoardRoom()` entirely (no `POST /api/rooms`), just initialize a local
    `Y.Doc` with `initialStorage()`'s shape and persist it, then `registerBoard()` as today.
  - `'shared'`: unchanged — calls `createBoardRoom()` then `registerBoard()`.
- **`BoardPage`/`ExportPage` routing**: look up the board's mode from the registry first.
  - Found + `'local'`: skip `RoomProvider`/`ClientSideSuspense`/`useRoomExists` entirely; mount the
    local-backend `BoardDocProvider` directly (existence is implicit — if IndexedDB has no record,
    treat as not-found).
  - Found + `'shared'`, or **not found in the registry at all**: fall back to today's path
    (`useRoomExists` against the backend, then `RoomProvider` + Liveblocks-backed
    `BoardDocProvider`). This is what keeps "open a sharable board link on a device that's never
    seen it" working exactly as it does today — and correctly 404s for a local-only board opened
    cold, since by design no server-side record of it can exist anywhere. No id-prefixing or other
    scheme needed to distinguish modes up front.
- **Delete flow**: local boards skip `deleteBoardRoom()` (no `DELETE /api/rooms/:id`), just clear
  the board's IndexedDB record and `forgetBoardEntry()`.

### 6. Multiplayer-only UI, gated by mode

Kept exactly as today, just conditionally rendered/initialized only when mode is `'shared'`:

- `PresenceAvatars`, `useOthers`/`useSelf`/`useUpdateMyPresence`, `localIdentity.ts` — no presence
  concept exists for a local-only board; these hooks/components simply aren't mounted.
- `CollaborationCaret` in `CollaborativeTextField.tsx` — becomes conditional on a Liveblocks
  provider actually existing; the `Collaboration` extension (TipTap ↔ `Y.Doc` binding) stays
  unconditional in both modes, since that's the "keep the complex text editor for parity" piece —
  a local board's text fields are still `Y.XmlFragment`s edited through the same TipTap
  integration, just with no remote collaborator ever able to show a cursor in them.
- **Share-by-link**: no dedicated "copy link"/share UI exists in the codebase today (sharing today
  is just "send the URL") — nothing to remove now, but any such affordance added later must gate
  on `mode === 'shared'`.

### 7. Backend / admin tooling impact

- `backend/`'s room-lifecycle endpoints (`createRoom.ts`, `getRoom.ts`, `deleteRoom.ts`,
  `liveblocksAuth.ts`) are unchanged — they're simply never called by local-only boards, and keep
  serving sharable mode exactly as today.
- **`backend/src/scripts/manage-rooms.ts` needs updating.** Its `fetchTitle` currently reads a
  room's title via `liveblocks.getStorageDocument(roomId, 'json')`, which only works against native
  `LiveObject`/`LiveList` Storage — once storage moves to a synced Yjs doc, this call stops
  returning the title. Needs to instead fetch and decode the room's Yjs state server-side (verify
  the exact current `@liveblocks/node` API for this — likely a binary-update read plus local
  `Y.applyUpdate`/`Y.Doc` decode, but confirm against the installed `@liveblocks/node` version
  during implementation rather than assuming a method name here).

## Suggested build sequence

Structured so each phase leaves the app in a fully working, testable state — the storage-model
rewrite (the highest-risk, highest-effort part) lands and is verified against today's *only*
existing mode (sharable) before local-only mode is added on top of it:

1. **Unify storage onto Yjs, sharable mode only.** Merge native Storage into the existing
   `Y.Doc`/`LiveblocksYjsProvider` pipeline; rewrite all mutation/read hooks; add Zod schemas.
   User-facing behavior is unchanged — this phase is pure internals, verifiable with the existing
   smoke test plus new unit tests for the rewritten hooks.
2. **Add the local backend + mode plumbing.** IndexedDB persistence adapter, `BoardDocProvider`
   generalized to switch backends, `mode` field on `BoardSummary`/registry, creation/routing
   branches, dev-only mode selector in the New Board modal.
3. **Gate multiplayer-only UI by mode.** Presence, collaboration cursors, delete-flow branching.
4. **Update admin tooling + tests.** `manage-rooms.ts`'s Yjs-aware title lookup; extend
   `scripts/smoke-test.mjs` to also drive a local-only board end to end (no backend involved).

## Rough effort estimate

| Piece | Work | Effort |
|---|---|---|
| Zod schemas + Yjs shared-type schema design | New schemas in `packages/shared`, doc shape design | 0.5–1 day |
| Rewrite 20 mutation hooks + `doc.transact` | Mechanical per-hook port, `LiveObject`/`LiveList` → `Y.Map`/`Y.Array` | 1–1.5 days |
| Rewrite 10 read hooks as `useSyncExternalStore` selectors | Genuinely new code, no direct Liveblocks equivalent | 1–1.5 days |
| Merge native Storage into existing `Y.Doc`/provider pipeline | Retire `liveblocks.config.ts`'s `Storage` type/`createRoomContext<Presence, Storage>` split | 0.5 day |
| IndexedDB local persistence backend | Load/debounced-save adapter, compaction on write | 0.5–1 day |
| Mode plumbing (registry field, creation/routing branches, dev-only selector) | `BoardSummary`, `HomePage`, `BoardPage`, `ExportPage`, `useCreateBoard`/`useDeleteBoard` | 1 day |
| Gate presence/collab-caret/delete flow by mode | `PresenceAvatars`, `CollaborativeTextField`, delete flow | 0.5 day |
| `manage-rooms.ts` Yjs-aware title lookup | Verify `@liveblocks/node` API, reimplement `fetchTitle` | 0.5 day |
| Testing | New hook unit tests; smoke test covers both modes | 1 day |

**Total: roughly 6.5–9 developer-days.** Comparable to Option B's original 5–6-day estimate for
the *build*, but — unlike Option B — this doesn't leave a permanent per-feature "implement it
twice" tax afterward, since both modes share every mutation/read hook going forward.

## Explicitly out of scope / deferred

- **Undo/redo.** Liveblocks Storage's `room.history` is lost by this migration; not replaced with
  `Y.UndoManager` since undo isn't a feature the app has today.
- **Server-side storage introspection/dashboard visibility**, beyond what `manage-rooms.ts` is
  updated to do for title lookup specifically.
- **Migrating existing room data** — confirmed disposable; re-check this assumption before
  building if that's changed by the time this is implemented.
- **A "convert local board to sharable" (or vice versa) feature** — not requested; the two modes
  are chosen once at creation. Technically cheap later (same `Y.Doc` shape, just point a
  `LiveblocksYjsProvider` at a freshly-created room and push local state through it), worth noting
  as a natural follow-up if wanted.
