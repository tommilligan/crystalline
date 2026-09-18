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
