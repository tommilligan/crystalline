#!/usr/bin/env bash
# Regenerates the committed walkthrough screenshots in docs/screenshots/ by running the exact
# same tested smoke-test step sequence used to verify the app actually works (see
# scripts/smoke-test.mjs) — so the doc images can never drift from what's verified to pass.
#
# Uses non-default ports so this can't collide with a developer's own already-running
# `npm run dev` (scripts/run-app.sh's cleanup kills whatever is listening on its target ports,
# not just what it started).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

export SMOKE_SCREENSHOT_DIR="docs/screenshots"
export SMOKE_BOARD_TITLE="Crystal Ball walkthrough"
export BACKEND_PORT="${BACKEND_PORT:-4100}"
export FRONTEND_PORT="${FRONTEND_PORT:-5273}"

exec scripts/run-app.sh
