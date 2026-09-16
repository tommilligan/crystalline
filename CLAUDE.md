# Crystal Ball — Claude context

Spec-only repo (no code yet) for **Crystal Ball**, a single-page team decision-making tool
based on de Bono's *Six Thinking Hats*: separate phases for framing, idea generation,
evaluation, scoring, and deciding, so judgment never contaminates idea generation.

Read `README.md` first — it lists the design docs in intended reading order.

## Doc overview

Core spec (`docs/`):
- `concept.md` — the methodology and what the tool is
- `personas.md` — user types and needs
- `phases.md` — phase lifecycle and navigation
- `data-model.md` — entities, board states, scoring
- `event-schema.md` — event-sourced state model (multiplayer-ready, single-user for MVP)
- `mvp-scope.md` — v1 in/out scope and resolved open questions
- `ui-notes.md` — interaction/layout notes (visual design deferred)

Research notes:
- `excalidraw-live-collaboration-system-research-notes.md` — how Excalidraw's live
  collaboration works end-to-end (Socket.IO relay + Firebase persistence, E2E encryption,
  per-element `(version, versionNonce)` reconciliation, fractional-index ordering). Relevant
  background if/when Crystal Ball's event-schema multiplayer model gets implemented —
  Excalidraw's deterministic last-write-wins reconciliation is a concrete prior art example.

`assets/original-whiteboard-example.png` — real worked whiteboard example (pharma/QC OD test
samples) the tool is modeled on.

## Working notes

- This repo currently holds specs only — there's no build, test, or lint setup to run.
- When adding new research/investigation docs, follow the existing pattern: descriptive
  kebab-case filename in `docs/`, linked from README's "Start here" list if it's core spec,
  or just left as a standalone research note (like the Excalidraw one) otherwise.
