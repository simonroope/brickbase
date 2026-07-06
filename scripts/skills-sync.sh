#!/usr/bin/env bash
# Sync .claude/skills/ → .codex/skills/ and ~/.codex/skills/
# .claude/skills/ is the source of truth — add new skills there directly.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for d in "$REPO"/.claude/skills/*/; do
  skill=$(basename "$d")
  if [ ! -f "$d/SKILL.md" ]; then continue; fi

  for dest in \
    "$REPO/.codex/skills/$skill" \
    "$HOME/.codex/skills/$skill"; do
    mkdir -p "$dest"
    printf -- '---\nname: %s\ndescription: %s skill\n---\n\nFollow the instructions in %s/.agents/skills/%s/SKILL.md\n' \
      "$skill" "$skill" "$REPO" "$skill" > "$dest/SKILL.md"
  done

  echo "Synced: $skill"
done

echo "Done — skills synced to .codex/skills/ and ~/.codex/skills/"
