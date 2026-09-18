# Event Schema

> **Status:** this describes the originally-planned design. The implementation mutates
> Liveblocks Storage directly instead of an append-only event log — see `docs/architecture.md`'s
> "Divergences from the spec docs" and the doc comment at the top of
> `frontend/src/hooks/useBoardMutations.ts`.

## Why event-sourced, even for a single-user MVP

The board's visible state is always a **fold/reduction over an append-only event log**, rather
than a directly-mutated record. For a single-device MVP this mostly just buys clean undo/redo
for free. The real payoff is that it makes the planned future step — a live, 1–100 participant
collaborative backend similar to Google Docs/Excalidraw, where a shared link lets multiple
clients post events into the same stream — an **additive** change (add a transport + a
multi-writer merge policy) rather than a rewrite of how state is managed.

**Note:** an aggregated audit-log *feature* (surfacing this event history to end users, e.g. as
an export appendix) was considered and explicitly deprioritised — see `mvp-scope.md`. The event
log still exists as the internal state mechanism; it's just not exposed anywhere in product yet.

## MVP transport

None. Single device, single user, no network calls. Events are appended to an in-memory array
and persisted to local storage (or IndexedDB, if payload size warrants it) on each append, so a
refresh doesn't lose state. No server round-trip in v1.

## Event envelope

Every event shares a common envelope:

```json
{
  "event_id": "uuid",
  "board_id": "uuid",
  "type": "idea_added",
  "timestamp": "2026-09-16T09:41:00Z",
  "payload": { }
}
```

`timestamp` and `event_id` exist because they're intrinsic to an event-sourced design (ordering,
idempotency) — not to power a visible audit trail feature.

## Event types

### `board_created`
Seed event. Every board's log starts with exactly one of these.
```json
{
  "type": "board_created",
  "payload": {
    "title": "OD Test Sample Reintegration",
    "seed": {
      "situation": "",
      "options": [],
      "decision": null
    }
  }
}
```
For a **clone**, `seed` is pre-populated with the parent's content (minus `approved_by`, `date`,
`dissent` — see `data-model.md`), but this is still the *only* event in the clone's log. The
clone does not replay the parent's history.

### `situation_updated`
```json
{ "type": "situation_updated", "payload": { "text": "Reintegrate OD test samples back into final product" } }
```

### `phase_changed`
```json
{ "type": "phase_changed", "payload": { "phase": "ideation" } }
```

### `idea_added`
```json
{ "type": "idea_added", "payload": { "option_id": "uuid", "text": "Return samples to lot with defined conditions" } }
```

### `idea_updated`
```json
{ "type": "idea_updated", "payload": { "option_id": "uuid", "text": "Return samples to lot with defined conditions (revised)" } }
```

### `evaluation_updated`
```json
{ "type": "evaluation_updated", "payload": { "option_id": "uuid", "enabler": "Consistent approach but with rules", "blocker": "Must carefully define conditions" } }
```

### `score_set`
A full score-set replacement for one option (MVP: single facilitator-entered value, not
per-voter). Modelled so that a future `score_submitted` (per-participant) event can be added
alongside it without breaking this shape.
```json
{
  "type": "score_set",
  "payload": {
    "option_id": "uuid",
    "scores": { "people": 3, "time": 3, "money": 5, "quality": 1, "service": 1, "price": 5 }
  }
}
```

### `decision_recorded`
```json
{
  "type": "decision_recorded",
  "payload": {
    "chosen_option_id": "uuid",
    "countermeasure": "Perform a one-time SOP change with training"
  }
}
```

### `dissent_noted`
```json
{ "type": "dissent_noted", "payload": { "text": "QA raised concern about retain sample stability timelines" } }
```

### `board_signed`
Terminal event for an active board. Sets `lifecycle_state = signed`.
```json
{ "type": "board_signed", "payload": { "approved_by": "J. Smith", "date": "2026-09-16" } }
```

## Reduction (projection) rules, briefly

- `board_created.seed` initialises `BoardState`.
- `situation_updated` overwrites `situation`.
- `phase_changed` overwrites `current_phase`.
- `idea_added` appends a new `Option`; `idea_updated` patches text on matching `option_id`.
- `evaluation_updated` patches enabler/blocker on matching `option_id`.
- `score_set` overwrites the full `ScoreSet` on matching `option_id`; `total` is always computed
  at read-time, never stored.
- `decision_recorded` sets `Decision.chosen_option_id` and `.countermeasure`.
- `dissent_noted` sets `Decision.dissent` (can be updated even after `board_signed`? — **no**,
  once `board_signed` has been folded, the reducer should treat the board as immutable and
  reject/ignore further events other than none — enforce this at the write boundary, not just
  in the reducer).
- `board_signed` sets `lifecycle_state = "signed"`, `signed_at`, and `Decision.approved_by`/`.date`.

## Explicitly deferred (not MVP, but the schema shouldn't preclude them)

- `score_submitted` (per-participant, for future collaborative voting) alongside/replacing
  `score_set`.
- A `client_id`/`author_id` field on the envelope, once there's more than one writer.
- Conflict resolution / merge policy for concurrent events from multiple clients.
