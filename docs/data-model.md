# Data Model

> **Status:** this describes the original design. The implementation has 4 phases (not 5 —
> `evaluation` absorbed `scoring`), no event log, configurable rating properties instead of
> a fixed six dimensions, and no template concept at all — see `docs/architecture.md`.

## Board

The top-level entity. One board = one Crystal Ball exercise.

```
Board
  id: string (uuid)
  title: string
  lifecycle_state: "active" | "signed"
  created_at: timestamp
  signed_at: timestamp | null
  cloned_from: null                 // always null — see "Clone" below
```

`Board` itself holds almost no direct fields — its actual content (situation text, options,
scores, decision) is a **derived projection** of its event log (see `event-schema.md`). This
keeps the persisted/source-of-truth data as the event stream, and the `Board` record as a thin
index/metadata wrapper (useful for a "my boards" list view, search, etc.).

## Derived board state (the projection)

This is what the UI actually renders, computed by folding the event log:

```
BoardState
  situation: string
  current_phase: "situation" | "ideation" | "evaluation" | "scoring" | "decision"
  options: Option[]
  decision: Decision | null
```

```
Option
  id: string
  text: string
  enabler: string | null
  blocker: string | null
  scores: ScoreSet | null
  created_at: timestamp   // for display ordering only; not an audit feature
```

```
ScoreSet
  people: 1-5   // 1 = bad (high cost), 5 = good (low cost)
  time: 1-5
  money: 1-5
  quality: 1-5  // 1 = bad (low quality), 5 = good (high quality)
  service: 1-5
  price: 1-5
  total: number  // sum of the six values, computed, not stored
```

```
Decision
  chosen_option_id: string
  countermeasure: string      // "notes on how to overcome cons"
  dissent: string | null      // "note dissent if objections" — present even after sign-off
  approved_by: string | null
  date: date | null
```

## Scoring convention

Per the resolved discussion: **1 = bad, 5 = good**, applied identically to all six dimensions
(People, Time, Money, Quality, Service, Price). No dimension is inverted. The scoring UI should
show this legend persistently, not just as a one-time tooltip — this was the single point of
confusion identified when reviewing the original whiteboard tool.

## Templates

A new board is always created "from template" (conceptually similar to a blank Google Doc that
happens to have structure pre-filled):

- Default template: the five standard columns, with the standard six scoring dimensions
  (People/Time/Money/Quality/Service/Price) and their legend.
- The data model should not hard-code "6 scoring dimensions" as a fixed shape if avoidable —
  model `ScoreSet` as a list of `{dimension_name, value}` pairs internally, even though the MVP
  only ever presents the standard six. This keeps the door open for custom templates later
  without a schema migration, but **no custom template UI is being built for MVP.**

## Clone

Cloning a **signed** board produces a completely new, independent board:

- New `id`, new empty event log (the clone's history starts from a single seed event, not a
  copy of the parent's events).
- All content fields are copied as **initial values** into that seed event: situation text, all
  options with their text/enablers/blockers/scores, and the decision's chosen option +
  countermeasure.
- `approved_by`, `date`, and `dissent` are explicitly **excluded** — the clone starts in
  `active` lifecycle state with those fields empty, ready for a fresh sign-off cycle.
- `cloned_from` is **not populated** — the clone has no traceable link back to its parent. This
  was a deliberate simplification: a clone is a fresh document, full stop.
