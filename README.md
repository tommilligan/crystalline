# Crystal Ball

A structured, single-page decision-making tool for teams, based on Dr. Edward de Bono's *Six
Thinking Hats*.

[![CI](https://github.com/tommilligan/crystalline/actions/workflows/ci.yml/badge.svg)](https://github.com/tommilligan/crystalline/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![The original physical whiteboard this tool is modeled on: a pharma/QC team's worked example deciding what to do with OD test samples](assets/original-whiteboard-example.png)

## What is this

Crystal Ball enforces sequential, single-mode thinking — separating problem framing, idea
generation, evaluation, scoring, and decision-making into distinct phases — so that judgment is
never applied before a team has finished generating options. It started life as a physical
whiteboard exercise (see the worked example above) and this repo turns it into a real-time
collaborative web app: a React/Vite frontend, an Express backend, and a Liveblocks-backed
multiplayer board. See [`docs/concept.md`](docs/concept.md) for the full methodology.

## Origin

The Crystal Ball exercise — this specific interpretation of Dr. de Bono's *Six Thinking Hats* —
was created by **Bob Darius**, while at GSK/Sanofi, as a physical whiteboard exercise he ran with
his own team. He wrote about it in a
[LinkedIn post](https://www.linkedin.com/posts/activity-7305992104365678592-QWPq). That post,
and the worked example above, are what directly inspired this project.

The software implementation in this repository was built afterward, as an interpretation of that
exercise into a real-time collaborative tool — it is not the original methodology, just a way to
run it online.

## Getting started

```
npm install
```

The backend needs a Liveblocks secret key. Copy `backend/.env.example` to `backend/.env` and
fill in `LIVEBLOCKS_SECRET_KEY` with a real key from your
[Liveblocks dashboard](https://liveblocks.io/dashboard/apiKeys).

```
npm run dev
```

This runs the frontend and backend dev servers concurrently. See
[`docs/architecture.md`](docs/architecture.md)'s "Testing & dev workflow" section for other
scripts (typecheck, build, lint, tests, and the full-browser smoke test).

## Documentation

[`docs/README.md`](docs/README.md) is the design-spec and architecture reading order — start
there for how the tool works and how the implementation is put together.

## License

MIT — see [LICENSE](LICENSE).
