# Crystal Ball — Claude context

**Crystal Ball** is a single-page, real-time collaborative team decision-making tool based on
de Bono's *Six Thinking Hats*: separate phases for framing, idea generation, evaluation, and
deciding, so judgment never contaminates idea generation.

This repo holds both the **design spec** (`docs/`, `README.md`'s reading order) and a **working
implementation** — an npm workspaces monorepo with a React/Vite frontend, an Express backend,
and a Liveblocks-backed multiplayer board. Read `docs/architecture.md` first for how the code is
actually built; it also lists where the implementation diverged from the original spec docs
during development.

## Repo layout

```
frontend/         React 19 + Vite + Mantine SPA — the whole product surface
backend/          Express API — room lifecycle + Liveblocks auth token minting
packages/shared/  Types/validation shared across the frontend/backend boundary
docs/             Spec + architecture + research docs — see README.md
design/           Early visual-design brief (Figma prompt + screenshot)
scripts/          run-app.sh (dev + smoke test), smoke-test.mjs (Playwright)
assets/           Original physical-whiteboard example the tool is modeled on
```

## Dev workflow

- `npm run dev` — frontend + backend dev servers, concurrently.
- `npm run typecheck` / `npm run build` / `npm run lint` / `npm run format` — root scripts, run
  across all workspaces (Biome for lint/format; `tsc -b` per workspace for typecheck/build).
- `npm run test -w frontend` — Vitest unit tests.
- **`scripts/run-app.sh`** — starts both dev servers and drives the full board flow through a
  real headless browser (`scripts/smoke-test.mjs`). This is the "run it and look at it" check —
  use it to verify a change against the actual running app, not just `tsc`/unit tests. Needs
  `backend/.env` (copy `backend/.env.example`, fill in a real `LIVEBLOCKS_SECRET_KEY`). See
  `docs/architecture.md`'s "Testing & dev workflow" section for flags and details.
  Its cleanup kills whatever is listening on its target ports, not just what it started — an
  agent verifying a change should always override `BACKEND_PORT`/`FRONTEND_PORT` to something
  other than the defaults (e.g. `BACKEND_PORT=4100 FRONTEND_PORT=5273 scripts/run-app.sh`) so it
  can't collide with a developer's own already-running `npm run dev`.

## Deployment

Production is local-only mode (no backend involved — see `docs/local-first-mode-plan.md`), so
deployment is just static frontend assets. `npm run build:static` (root) builds `packages/shared`
+ `frontend` only and is host-agnostic: set `CRYSTALLINE_BASE_PATH` to the full absolute URL
(origin + path, trailing slash required) the build will be served from when it isn't the local dev
server — it drives both Vite's asset `base` and `BrowserRouter`'s `basename`, see
`frontend/vite.config.ts`. Defaults to `http://localhost:<FRONTEND_PORT>/`, so plain
`npm run build:static` needs no env var at all. `.github/workflows/deploy-pages.yml` is the thin
GitHub-specific layer that hands this build to GitHub Pages on push to `main` — see its comments
for the SPA-on-Pages details (base URL resolution via `actions/configure-pages`, the `404.html`
client-routing fallback).

## Doc overview

- `docs/architecture.md` — **start here** for the current implementation: state model
  (Liveblocks Storage vs. Yjs vs. local-only), room lifecycle/auth, frontend structure, dev
  workflow, and where the code diverged from the spec docs below.
- `docs/concept.md` — the methodology and what the tool is
- `docs/personas.md` — user types and needs
- `docs/phases.md` — phase lifecycle and navigation (original 5-phase design; implementation
  merged two of these — see `docs/architecture.md`)
- `docs/data-model.md` — entities, board states, scoring (original design)
- `docs/event-schema.md` — the originally-planned event-sourced state model, superseded by
  direct Liveblocks Storage mutations — see `docs/architecture.md`
- `docs/mvp-scope.md` — original v1 in/out scope; several "deferred" items (notably multiplayer)
  are now built — see `docs/architecture.md`
- `docs/ui-notes.md` — interaction/layout notes from the original design
- `docs/collaborative-editing-library-architecture-options.md` — the Liveblocks/Yjs/TipTap
  research that the current stack was chosen from
- `assets/original-whiteboard-example.png` — the real worked whiteboard example (pharma/QC OD
  test samples) the tool is modeled on

## Working notes

- Full stack, not spec-only: there's a real build/test/lint setup now (see "Dev workflow"
  above) — use it rather than eyeballing changes.
- When adding new research/investigation docs, follow the existing pattern: descriptive
  kebab-case filename in `docs/`, linked from README's "Start here" list if it's core spec, or
  left as a standalone research note otherwise.
- The spec docs above describe the *original* design and its reasoning, and are still the right
  place for *why* — but several no longer describe what's shipped. Don't treat them as ground
  truth for current behavior without cross-checking `docs/architecture.md`.
