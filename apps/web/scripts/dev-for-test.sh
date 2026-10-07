#!/usr/bin/env bash
# Clear a stale Next.js dev lock, then start the webpack dev server (for Cucumber).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

lock=".next/dev/lock"
id=""
if [ -f "$lock" ]; then
  id=$(cat "$lock" || true)
  rm -f "$lock"
fi
[ -n "${id}" ] && echo "Locks deleted: ${id}"

exec npx next dev --webpack
