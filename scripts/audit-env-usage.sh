#!/usr/bin/env bash
set -euo pipefail

# Audit for import-time env reads.
# We only flag the most common dangerous pattern:
#   const X = process.env.Y
# at module scope (top-level assignments).
#
# Note: reads inside functions/handlers are allowed.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

node "$ROOT_DIR/scripts/audit-env-usage.node.js"
