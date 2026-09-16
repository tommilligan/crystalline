# Crystal Ball — Decision Making Framework

A structured, single-page decision-making tool for teams, inspired by Dr. Edward de Bono's
*Six Thinking Hats*. Crystal Ball enforces sequential, single-mode thinking — separating
problem framing, idea generation, evaluation, scoring, and decision-making into distinct
phases — so that judgment is never applied before a team has finished generating options.

This repository contains the **design spec for an MVP web implementation** of the tool,
originally used as a physical whiteboard exercise (see `assets/original-whiteboard-example.png`
for a real worked example: a pharma/QC team deciding what to do with OD test samples).

This is a spec-only repo intended to seed a development environment — there is no code here yet.

## Start here

1. [`docs/concept.md`](docs/concept.md) — what the tool is and the five-phase methodology, for anyone unfamiliar with the original whiteboard exercise
2. [`docs/personas.md`](docs/personas.md) — who uses this and what they each need
3. [`docs/phases.md`](docs/phases.md) — the phase lifecycle and navigation model
4. [`docs/data-model.md`](docs/data-model.md) — entities, board states, scoring
5. [`docs/event-schema.md`](docs/event-schema.md) — the event-sourced state model (built for future multiplayer, single-user for MVP)
6. [`docs/mvp-scope.md`](docs/mvp-scope.md) — what's in/out for v1, and the resolved open design questions
7. [`docs/ui-notes.md`](docs/ui-notes.md) — interaction points and layout notes (visual design deferred to a UX framework)

## Origin

Crystal Ball was developed by the tool's author over 10 years ago after reading *Six Thinking
Hats* by Dr. de Bono. The core discipline it encodes: **develop the problem statement as a team
first, generate ideas next while suspending all judgement, and only then move on to evaluating,
scoring, and deciding.**
