#!/usr/bin/env bash
# Run the groceries API (FastAPI on :8000) and UI (Next.js on :3000) together.
# Ctrl+C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Activate the Python virtualenv if one exists
for venv in "$ROOT/groceries-env" "$ROOT/groceries-api/groceries-env" "$ROOT/.venv" "$ROOT/groceries-api/.venv"; do
  if [ -f "$venv/bin/activate" ]; then
    # shellcheck disable=SC1091
    source "$venv/bin/activate"
    break
  fi
done

if ! command -v uvicorn >/dev/null 2>&1; then
  echo "uvicorn not found. Set up the API env first:" >&2
  echo "  uv venv --python 3.9 groceries-env && source groceries-env/bin/activate && uv pip install -r groceries-api/requirements.txt" >&2
  echo "  (requires Python 3.9 to match the Dockerfile; install uv with: brew install uv)" >&2
  exit 1
fi

# Install UI deps on first run
if [ ! -d "$ROOT/groceries-ui/node_modules" ]; then
  (cd "$ROOT/groceries-ui" && npm install)
fi

cleanup() {
  trap - INT TERM EXIT
  kill 0 2>/dev/null || true
}
trap cleanup INT TERM EXIT

(cd "$ROOT/groceries-api" && uvicorn groceries_api:app --reload 2>&1 | sed 's/^/[api] /') &
(cd "$ROOT/groceries-ui" && npm run dev 2>&1 | sed 's/^/[ui]  /') &

echo "API: http://localhost:8000   UI: http://localhost:3000   (Ctrl+C to stop)"
wait
