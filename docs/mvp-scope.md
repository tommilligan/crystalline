# MVP Scope & Resolved Design Questions

> **Status:** this is the original scoping doc. A few calls made here were resolved differently
> once implementation started — most notably, multiplayer is built rather than deferred, and
> Clone/PNG-export/un-signing don't (yet) exist as described below. See `docs/architecture.md`'s
> "Divergences from the spec docs" for the current, accurate picture.

This doc exists so a developer picking this up doesn't have to re-derive decisions that were
already made and reasoned through during design. Where relevant, the reasoning is included, not
just the conclusion.

## In scope for MVP

- Single device, single user, no accounts, no auth.
- Event-sourced internal state (see `event-schema.md`), but with **no network transport** — all
  events stay local (in-memory + local storage/IndexedDB for persistence across refresh).
- Five-phase board (`situation`, `ideation`, `evaluation`, `scoring`, `decision`) with free
  navigation between phases at any time (see `phases.md`).
- Standard six-dimension scoring (People/Time/Money/Quality/Service/Price), all on a
  consistent 1=bad, 5=good scale, with the legend always visible.
- Single facilitator-entered score per option (no per-participant voting UI yet).
- Decision phase capturing: chosen option, countermeasure, dissent (free text), approver name,
  date.
- Sign-off action that flips the board to `signed` (read-only) state.
- Clone action on a signed board, producing a completely fresh board pre-filled with the
  parent's content (minus approver/date/dissent), with no link back to the parent.
- "New board from template" as the creation entry point.
- Export to PNG of the current board state.

## Explicitly out of scope for MVP (but designed-for, not precluded)

| Feature | Status | Why deferred |
|---|---|---|
| Live multiplayer (shared link, 1–100 participants, events posted to a backend) | Deferred | Real complexity (transport, conflict resolution, presence). Event-sourced design chosen specifically so this is additive later, not a rewrite. |
| Visible audit log (e.g. exported as a PDF appendix showing "idea added late," etc.) | **Dropped**, not just deferred | Considered during design; value wasn't clear enough to justify the UI/export work. The underlying event log still exists internally (it's the state mechanism) — surfacing it is a small addition *if* the need re-emerges later, but nothing is being built toward it now. |
| Per-participant / collaborative live scoring (voting) | Deferred | MVP is single facilitator-entered scores, agreed out-of-band. Schema (`score_set`) is shaped so a `score_submitted` per-voter event can sit alongside it later. |
| PDF export | Deferred | PNG covers the MVP need; PDF is "amazing later," per direct feedback, once the export pipeline exists. |
| Custom/user-defined templates (different scoring dimensions, extra columns) | Deferred | Data model avoids hard-coding to prevent a future migration, but no UI for authoring templates is being built now. |
| Authentication / real identity behind "Approved By" | Deferred | Free-text field only in MVP. Flagged as insufficient if this tool is ever used somewhere sign-off needs to be a real accountability record. |
| Un-signing / re-opening a signed board | **Not planned at all** | The correct flow for "I need to change something after sign-off" is Clone, not mutating a signed record. |

## Key clarifications settled during design (for reference)

- **"1–100 participants, synchronous"** refers to people in a physical room contributing
  verbally to a single facilitator's input, in the target MVP scenarios (laptop chat, or
  projector in a meeting room) — **not** 100 simultaneous system users/writers. True multi-writer
  support is part of the deferred live-collaboration feature above.
- **Clone is a completely fresh document.** No `cloned_from` pointer, no shared event history,
  new event log starting from a single seed event containing the copied field values.
- **Scoring is always 1 = bad, 5 = good**, on every dimension, both cost-side (People/Time/Money)
  and benefit-side (Quality/Service/Price) — no inverted scales. This was a direct fix to a
  point of confusion in the original whiteboard version, where low-cost scored as a 5 without
  a visible explanation of why.
