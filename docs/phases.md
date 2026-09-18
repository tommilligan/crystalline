# Phase Lifecycle

> **Status:** this describes the original 5-phase design. The implementation merges `evaluation`
> and `scoring` into a single `evaluation` phase, and phase focus is plain per-viewer React
> state rather than derived from an event log — see `docs/architecture.md`.

## Phases

1. `situation`
2. `ideation`
3. `evaluation`
4. `scoring`
5. `decision`

## Navigation model: maximum flexibility, gentle encouragement

The tool should **never lock a user out of a phase**. The methodology's value comes from
*encouraging* sequential thinking, not enforcing it mechanically — a facilitator might
legitimately need to jump back to Ideation mid-Evaluation because the room just thought of a
new option, and the tool should not fight that.

Concretely:

- A persistent phase selector (dropdown, tabs, or breadcrumb — implementation detail for the
  chosen UX framework) lists all five phases. Any phase is clickable at any time.
- The **current** phase is visually emphasised (e.g. its column is expanded/highlighted; others
  may be collapsed or dimmed but remain visible and editable).
- Clicking directly into a column's UI (e.g. clicking the Evaluation column body) should also
  switch the current phase to Evaluation — the phase selector and direct column interaction are
  two paths to the same state change.
- Jumping between phases **never deletes or hides data** already entered in other phases. Moving
  from Evaluation back to Ideation just re-exposes the ideation input alongside the (still
  visible, still editable) enabler/blocker fields for existing options.
- There is no validation gate ("you must add at least 3 ideas before evaluating") in the MVP.
  Soft nudges (see below) are the only encouragement mechanism.

## Soft nudges (encouragement without enforcement)

Ideas for lightweight, non-blocking encouragement toward the intended order — none of these
should ever prevent an action, only suggest:

- On first opening a fresh board, default the current phase to `situation` and visually
  de-emphasise the other four columns until at least one phase-jump or column-click occurs.
- A subtle empty-state hint in Evaluation/Scoring columns when no options exist yet (e.g.
  "Add some options first, or jump in anyway") — informational, not a blocker.
- Optional (not MVP-critical): a visible timer for the Situation phase, matching the
  facilitator's own 15–20 minute time-box habit. Purely advisory — it should not auto-advance
  the phase or lock anything when it expires.

## Phase state is derived, not stored per-se

Because the app is event-sourced (see `event-schema.md`), "current phase" is itself just the
latest `phase_changed` event's value, replayed like everything else. This means undo/redo and
board reload get correct current-phase behaviour for free.

In multi-user sessions, "current phase" is deliberately **per-viewer, not shared**: it's UI
emphasis, not board data. One participant clicking into the Scoring column while another is
mid-edit in Evaluation should not yank the second participant's view along with it. Each
client tracks its own current phase locally; only the underlying field data (ideas, scores,
decision, etc.) syncs between participants.

## Signed / read-only state

A board also has an overall lifecycle state, orthogonal to "current phase":

- `active` — normal editing, full phase navigation available.
- `signed` — set when the Decision phase's sign-off action is completed (Approved By + Date
  filled and confirmed). All fields render disabled. The phase navigation UI is hidden entirely,
  since there is nothing left to do on a signed board. The only actions available on a signed
  board are **Export** and **Clone**.

There is no "unsign" action in the MVP — if something needs to change after sign-off, the
correct flow is Clone (see `data-model.md`), not re-opening the signed board.
