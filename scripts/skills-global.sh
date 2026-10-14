#!/usr/bin/env bash
# Copy skills/ → ~/.claude/skills/ (user-global Claude Code skills).
# skills/ is the source of truth. Overwrites existing SKILL.md and supporting
# markdown in place — not repo-relative pointers, which only resolve inside
# this checkout.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${HOME}/.claude/skills"

mkdir -p "$DEST"

overwrite() {
  local src="$1" dest="$2"
  if [ -e "$dest" ]; then
    chmod u+w "$dest" 2>/dev/null || true
  fi
  cp -f "$src" "$dest"
}

for d in "$REPO"/skills/*/; do
  skill=$(basename "$d")
  if [ ! -f "$d/SKILL.md" ]; then continue; fi

  skill_dest="$DEST/$skill"
  existed=0
  if [ -e "$skill_dest/SKILL.md" ]; then
    existed=1
  fi
  mkdir -p "$skill_dest"
  overwrite "$d/SKILL.md" "$skill_dest/SKILL.md"
  for f in "$d"*.md; do
    fname=$(basename "$f")
    if [ "$fname" != "SKILL.md" ]; then
      overwrite "$f" "$skill_dest/$fname"
    fi
  done
  if [ "$existed" -eq 1 ]; then
    echo "Updated: $skill → $skill_dest"
  else
    echo "Copied: $skill → $skill_dest"
  fi
done

echo "Done — skills copied to $DEST"
