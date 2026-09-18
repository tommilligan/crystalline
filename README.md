# Crystal Ball — Decision Making Framework

A structured, single-page decision-making tool for teams, inspired by Dr. Edward de Bono's
*Six Thinking Hats*. Crystal Ball enforces sequential, single-mode thinking — separating
problem framing, idea generation, evaluation, scoring, and decision-making into distinct
phases — so that judgment is never applied before a team has finished generating options.

This repository contains both the **design spec** for the tool and a working MVP web
implementation (React/Vite frontend, Express backend, Liveblocks-backed multiplayer board),
originally used as a physical whiteboard exercise (see `assets/original-whiteboard-example.png`
for a real worked example: a pharma/QC team deciding what to do with OD test samples).

## Start here

1. [`docs/architecture.md`](docs/architecture.md) — how the current implementation is built, and
   where it diverged from the spec docs below during development
2. [`docs/concept.md`](docs/concept.md) — what the tool is and the methodology, for anyone unfamiliar with the original whiteboard exercise
3. [`docs/personas.md`](docs/personas.md) — who uses this and what they each need
4. [`docs/phases.md`](docs/phases.md) — the phase lifecycle and navigation model (original design)
5. [`docs/data-model.md`](docs/data-model.md) — entities, board states, scoring (original design)
6. [`docs/event-schema.md`](docs/event-schema.md) — the originally-planned event-sourced state model, since superseded — see `docs/architecture.md`
7. [`docs/mvp-scope.md`](docs/mvp-scope.md) — original in/out scope for v1, and the resolved open design questions
8. [`docs/ui-notes.md`](docs/ui-notes.md) — interaction points and layout notes from the original design

## Origin

Crystal Ball was developed by the tool's author over 10 years ago after reading *Six Thinking
Hats* by Dr. de Bono. The core discipline it encodes: **develop the problem statement as a team
first, generate ideas next while suspending all judgement, and only then move on to evaluating,
scoring, and deciding.**
