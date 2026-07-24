#!/usr/bin/env bash
# Sync skills/ → .claude/skills/, .codex/skills/, and ~/.claude/skills/
# skills/ is the source of truth — add new skills there directly.
#
# For each skill:
#   - .claude/skills/<name>/SKILL.md   — pointer using a relative path (portable)
#   - .claude/skills/<name>/*.md       — copies of all supporting markdown files
#   - .codex/skills/<name>/SKILL.md   — pointer using a relative path (portable)
#   - .codex/skills/<name>/*.md       — copies of all supporting markdown files
#   - ~/.claude/skills/<name>/SKILL.md — pointer using an absolute path
#   - ~/.claude/skills/<name>/*.md    — copies of all supporting markdown files
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

copy_supporting_files() {
  local src="$1" dest="$2"
  for f in "$src"*.md; do
    fname=$(basename "$f")
    if [ "$fname" != "SKILL.md" ]; then
      cp "$f" "$dest/$fname"
    fi
  done
}

for d in "$REPO"/skills/*/; do
  skill=$(basename "$d")
  if [ ! -f "$d/SKILL.md" ]; then continue; fi

  # ── Repo-level .claude/skills/ ─────────────────────────────────────────────
  cdest="$REPO/.claude/skills/$skill"
  mkdir -p "$cdest"
  printf -- '---\nname: %s\ndescription: %s skill\n---\n\nFollow the instructions in ../../skills/%s/SKILL.md\n' \
    "$skill" "$skill" "$skill" > "$cdest/SKILL.md"
  copy_supporting_files "$d" "$cdest"

  # ── Repo-level .codex/skills/ ──────────────────────────────────────────────
  dest="$REPO/.codex/skills/$skill"
  mkdir -p "$dest"
  printf -- '---\nname: %s\ndescription: %s skill\n---\n\nFollow the instructions in ../../skills/%s/SKILL.md\n' \
    "$skill" "$skill" "$skill" > "$dest/SKILL.md"
  copy_supporting_files "$d" "$dest"

  # ── Global ~/.claude/skills/ ───────────────────────────────────────────────
  gcdest="$HOME/.claude/skills/$skill"
  mkdir -p "$gcdest"
  printf -- '---\nname: %s\ndescription: %s skill\n---\n\nFollow the instructions in %s/skills/%s/SKILL.md\n' \
    "$skill" "$skill" "$REPO" "$skill" > "$gcdest/SKILL.md"
  copy_supporting_files "$d" "$gcdest"

  echo "Synced: $skill"
done

echo "Done — skills synced to .claude/skills/, .codex/skills/ (relative) and ~/.claude/skills/ (absolute)"
