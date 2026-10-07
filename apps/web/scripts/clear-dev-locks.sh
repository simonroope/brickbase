#!/usr/bin/env bash
# Remove Next.js `.next/dev/lock` so a new `next dev` can start.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

lock=".next/dev/lock"
id=""
if [ -f "$lock" ]; then
  id=$(cat "$lock" || true)
  rm -f "$lock"
fi

if [ -n "$id" ]; then
  echo "Locks deleted: $id"
else
  echo "No locks to delete"
fi
