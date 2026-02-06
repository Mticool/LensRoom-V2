#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-3000}
URL="http://localhost:${PORT}/create/studio?section=photo"

cat <<'TXT'
Smoke checklist (manual):
1) Open Studio photo: /create/studio?section=photo
2) Zoom to 70% -> gallery stays top-left, no centering.
3) Click Generate while at top -> scrolls to bottom with new items.
4) In gallery card menu: Regenerate -> fills prompt/settings, no auto-generate.
5) Download on card -> file downloads (desktop & mobile).
TXT

echo "Open: ${URL}"

if command -v open >/dev/null 2>&1; then
  open "${URL}"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${URL}"
else
  echo "Please open the URL manually in your browser."
fi
