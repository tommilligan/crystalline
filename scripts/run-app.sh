#!/usr/bin/env bash
# Runs the whole Crystal Ball app (backend + frontend dev servers) and drives it through the
# full five-phase board flow in a headless browser, so a change can be checked against the real
# app instead of just `tsc`/tests. This is the "run it and look at it" step from CLAUDE.md's dev
# workflow — reach for this instead of re-deriving the start/wait/drive/teardown dance by hand
# every time.
#
# Usage:
#   scripts/run-app.sh            # start both servers, run the smoke walk, tear down
#   scripts/run-app.sh --keep     # leave both servers running afterward (e.g. to poke around
#                                  # by hand at http://localhost:5173)
#   scripts/run-app.sh --no-smoke # just start the servers and wait, no browser walk
#   scripts/run-app.sh --mobile   # run the smoke walk in a phone-sized viewport (Playwright's
#                                  # "iPhone 13" profile) instead of desktop, so mobile-only
#                                  # layout changes get accurate screenshots — see
#                                  # scripts/smoke-test.mjs. Screenshots land in
#                                  # scripts/.run-app.local/screenshots-mobile/.
#   scripts/run-app.sh --dark     # emulate a dark-mode browser (the app has no in-app theme
#                                  # toggle, it just follows the OS/browser preference). Combine
#                                  # with --mobile for mobile+dark screenshots.
#
# BACKEND_PORT / FRONTEND_PORT env vars override the default ports (4000 / 5173). Automated
# verification (e.g. an agent checking a change) should always set these to something other than
# the defaults a developer's own `npm run dev` would be using — this script's cleanup kills
# whatever is listening on its target ports, not just what it started, so reusing a developer's
# ports risks tearing down a session that isn't ours.
#
# Logs and screenshots land in scripts/.run-app.local/ (gitignored — see repo .gitignore's
# `*.local` rule).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

BACKEND_PORT="${BACKEND_PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
LOG_DIR="scripts/.run-app.local"
mkdir -p "$LOG_DIR"

KEEP=false
RUN_SMOKE=true
MOBILE=false
DARK=false
for arg in "$@"; do
  case "$arg" in
    --keep) KEEP=true ;;
    --no-smoke) RUN_SMOKE=false ;;
    --mobile) MOBILE=true ;;
    --dark) DARK=true ;;
    *)
      echo "Unknown argument: $arg (expected --keep, --no-smoke, --mobile, and/or --dark)" >&2
      exit 1
      ;;
  esac
done

if [ ! -f backend/.env ]; then
  echo "backend/.env is missing." >&2
  echo "Copy backend/.env.example to backend/.env and fill in LIVEBLOCKS_SECRET_KEY first" \
    "(https://liveblocks.io/dashboard/apiKeys)." >&2
  exit 1
fi

free_port() {
  # `lsof` exits non-zero when nothing matches, which would otherwise trip `set -e` on every
  # already-free port — that's the common case, not an error.
  lsof -ti:"$1" -sTCP:LISTEN 2>/dev/null | xargs -r kill || true
}

# Clear any stale listeners from a previous crashed/interrupted run before we start, so `npm run
# dev` doesn't silently bind a different port than the one we're about to poll.
free_port "$BACKEND_PORT"
free_port "$FRONTEND_PORT"

cleanup() {
  if [ "$KEEP" = true ]; then
    echo "Leaving dev servers running (--keep): backend :$BACKEND_PORT, frontend :$FRONTEND_PORT"
    echo "Logs: $LOG_DIR/backend.log, $LOG_DIR/frontend.log"
  else
    echo "Stopping dev servers..."
    # $! below is npm's own PID, not the server it spawns, and npm doesn't forward SIGTERM to
    # its child — killing each port's actual listener is what reliably frees it.
    free_port "$BACKEND_PORT"
    free_port "$FRONTEND_PORT"
  fi
}
trap cleanup EXIT

echo "Starting backend (:$BACKEND_PORT) and frontend (:$FRONTEND_PORT)..."
PORT="$BACKEND_PORT" npm run dev -w backend >"$LOG_DIR/backend.log" 2>&1 &
BACKEND_PORT="$BACKEND_PORT" FRONTEND_PORT="$FRONTEND_PORT" npm run dev -w frontend >"$LOG_DIR/frontend.log" 2>&1 &

echo "Waiting for backend..."
if ! timeout 30 bash -c "until curl -sf http://localhost:$BACKEND_PORT/healthz >/dev/null; do sleep 0.5; done"; then
  echo "Backend didn't come up in time — see $LOG_DIR/backend.log" >&2
  exit 1
fi

echo "Waiting for frontend..."
if ! timeout 30 bash -c "until curl -sf http://localhost:$FRONTEND_PORT >/dev/null; do sleep 0.5; done"; then
  echo "Frontend didn't come up in time — see $LOG_DIR/frontend.log" >&2
  exit 1
fi

echo "Both servers are up."

if [ "$RUN_SMOKE" = true ]; then
  SMOKE_ARGS=("http://localhost:$FRONTEND_PORT")
  DESCRIPTORS=()
  if [ "$MOBILE" = true ]; then
    SMOKE_ARGS+=("--mobile")
    DESCRIPTORS+=("mobile viewport")
  fi
  if [ "$DARK" = true ]; then
    SMOKE_ARGS+=("--dark")
    DESCRIPTORS+=("dark mode")
  fi
  if [ "${#DESCRIPTORS[@]}" -gt 0 ]; then
    IFS=', '
    echo "Running the browser smoke walk (${DESCRIPTORS[*]})..."
    unset IFS
  else
    echo "Running the browser smoke walk..."
  fi
  node scripts/smoke-test.mjs "${SMOKE_ARGS[@]}"
else
  echo "Skipping the smoke walk (--no-smoke). App is at http://localhost:$FRONTEND_PORT"
  if [ "$KEEP" = false ]; then
    echo "Note: without --keep, the servers will stop as soon as this script exits." >&2
  fi
fi
