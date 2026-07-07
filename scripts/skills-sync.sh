#!/usr/bin/env bash
# Sync .claude/skills/ → .codex/skills/ and ~/.codex/skills/
# .claude/skills/ is the source of truth — add new skills there directly.
#
# For each skill:
#   - .codex/skills/<name>/SKILL.md  — pointer using a relative path (portable)
#   - .codex/skills/<name>/*.md      — copies of all supporting markdown files
#   - ~/.codex/skills/<name>/SKILL.md — pointer using an absolute path
#   - ~/.codex/skills/<name>/*.md    — copies of all supporting markdown files
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for d in "$REPO"/.claude/skills/*/; do
  skill=$(basename "$d")
  if [ ! -f "$d/SKILL.md" ]; then continue; fi

  # ── Repo-level .codex/skills/ ──────────────────────────────────────────────
  dest="$REPO/.codex/skills/$skill"
  mkdir -p "$dest"

  # Pointer file (relative path — portable across machines)
  printf -- '---\nname: %s\ndescription: %s skill\n---\n\nFollow the instructions in ../../.claude/skills/%s/SKILL.md\n' \
    "$skill" "$skill" "$skill" > "$dest/SKILL.md"

  # Copy supporting markdown files (everything except SKILL.md)
  for f in "$d"*.md; do
    fname=$(basename "$f")
    if [ "$fname" != "SKILL.md" ]; then
      cp "$f" "$dest/$fname"
    fi
  done

  # ── Global ~/.codex/skills/ ────────────────────────────────────────────────
  gdest="$HOME/.codex/skills/$skill"
  mkdir -p "$gdest"

  # Pointer file (absolute path — needed because cwd differs)
  printf -- '---\nname: %s\ndescription: %s skill\n---\n\nFollow the instructions in %s/.claude/skills/%s/SKILL.md\n' \
    "$skill" "$skill" "$REPO" "$skill" > "$gdest/SKILL.md"

  # Copy supporting markdown files (everything except SKILL.md)
  for f in "$d"*.md; do
    fname=$(basename "$f")
    if [ "$fname" != "SKILL.md" ]; then
      cp "$f" "$gdest/$fname"
    fi
  done

  echo "Synced: $skill"
done

echo "Done — skills synced to .codex/skills/ (relative) and ~/.codex/skills/ (absolute)"
