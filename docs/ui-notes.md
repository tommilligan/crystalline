# UI / Interaction Notes

> **Status:** this describes the original design. Notably, export is an HTML/print route rather
> than a PNG capture, Evaluation/Scoring are one column, not two, and there's no template picker
> — "New board" creates a board directly — see `docs/architecture.md`.

Visual design (colour, typography, spacing) is deferred to whichever UX framework is chosen for
implementation. This doc covers **interaction points and layout structure only** — the things
that would still be true regardless of which component library ends up rendering them.

## Overall layout

Five-column board, matching the original whiteboard structure, so anyone familiar with the
paper/marker version recognises it immediately:

`Situation | Options | Evaluation | Costs/Benefits | Decision`

- On a projector/wide-screen scenario, all five columns are visible at once, side by side —
  this is the primary target layout (mirrors the source image).
- On a narrower device (laptop, or later mobile), columns may need to collapse to a
  scrollable/tabbed view — worth flagging to whoever picks the UX framework, since the MVP
  scenarios (laptop chat, projector) both favour wide-layout-first design.

## Phase navigation

- A phase selector (dropdown, tab strip, or breadcrumb — framework's choice) sits above or
  alongside the board, always visible, listing all five phases.
- The current phase's column is visually emphasised (e.g. expanded, highlighted border) but
  **all columns remain visible and editable regardless of current phase** — see `phases.md` for
  why locking is deliberately avoided.
- Clicking directly into a column also sets that column's phase as current — two paths, one
  state change.

## Situation column

- Single large text input/textarea.
- Optional (nice-to-have, not blocking): a visible countdown/elapsed timer reflecting the
  facilitator's 15–20 minute time-boxing habit. Advisory only — never auto-advances or disables
  anything on expiry.

## Options / Ideation column

- Add-idea affordance that's fast to use repeatedly (this is the phase with the highest input
  velocity — a facilitator transcribing a room's ideas live). Think: text field + Enter-to-add,
  staying focused for rapid successive entries, rather than a modal per idea.
- Ideas render as a list (the "cloud" visual metaphor from the original whiteboard is a nice-to
  have skin, not a structural requirement).
- No delete-idea-that-isn't-yours concern in MVP (single user), but keep the affordance to edit
  or remove an idea simple regardless.

## Evaluation column

- For each existing option, two short text inputs: Enabler, Blocker.
- Should be scannable against the Options column — likely rendered as an extension of the same
  row/card per option, rather than a fully separate list, so the option text stays in view while
  its enabler/blocker are being filled in.

## Costs/Benefits (Scoring) column

- Six numeric inputs per option: People, Time, Money, Quality, Service, Price.
- **The 1=bad/5=good legend must be persistently visible here**, not just a tooltip — this was
  the single biggest point of confusion identified in review of the original tool, where an
  inverted cost scale wasn't obvious to a first-time user.
- A computed, read-only total (sum of the six values) shown per option — never manually
  editable.
- Consider a simple visual ranking indicator (e.g. options sorted by total, or the top score
  highlighted) once more than a couple of options have scores — purely a legibility aid, not a
  new data concept.

## Decision column

- Select which option was chosen (likely a picker referencing the existing option list, not
  free text, to keep it linked to a real `option_id`).
- Countermeasure: free text ("notes on how to overcome cons").
- Dissent: free text, explicitly always available/editable even conceptually after a decision is
  drafted — this is a "note objections" field, and objections can surface at any point in the
  conversation, not just before the decision is finalised.
- Approved By + Date fields, plus a distinct, deliberate "Sign" action (not just filling in the
  fields) that transitions the board to `signed` state. Signing should feel like a real
  commitment — a confirm step (e.g. "This will lock the board — you can still clone it later to
  make changes") is appropriate here, since it's irreversible in MVP.

## Signed (read-only) state

- All inputs across all five columns render disabled.
- Phase navigation UI is hidden entirely (nothing to jump to).
- Two actions remain available: **Export (PNG)** and **Clone**.

## New board / template entry point

- "New board" creates a board from the default template (five columns, standard six scoring
  dimensions, legend pre-set) — conceptually like opening a blank Google Doc from a template
  picker, even though there's only one template in MVP.

## Export

- PNG export captures the current board visual state as rendered (all five columns, whatever
  content exists, regardless of lifecycle state — exporting an in-progress `active` board should
  work too, not just a `signed` one).
- No audit-log appendix (see `mvp-scope.md` — deprioritised). Export is just the board image.
