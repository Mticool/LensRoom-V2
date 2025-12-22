#!/usr/bin/env bash
set -euo pipefail

# Start Next.js in production ONLY if build exists.
# This prevents "Could not find a production build in the '.next' directory" and
# related missing manifest errors.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f ".next/BUILD_ID" ]; then
  echo "[boot] NO BUILD_ID found in $ROOT_DIR/.next. Run 'npm run build' first." >&2
  exit 1
fi

PORT="${PORT:-3002}"
NODE_ENV="${NODE_ENV:-production}"
export PORT NODE_ENV

exec node "node_modules/next/dist/bin/next" start -p "$PORT"



