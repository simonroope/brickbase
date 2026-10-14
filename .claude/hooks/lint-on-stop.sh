#!/usr/bin/env python3
"""Stop: run npm run lint; block the stop when lint fails."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

REASON_TAIL = 8000
LINTABLE = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".rs"}


def payload_from_stdin() -> dict:
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def repo_root() -> Path:
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def lintable_changes(root: Path) -> bool:
    result = subprocess.run(
        ["git", "status", "--porcelain", "--untracked-files=all"],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return True
    for raw in result.stdout.splitlines():
        path = raw[3:] if len(raw) > 3 else raw
        if " -> " in path:
            path = path.split(" -> ", 1)[1]
        posix = path.replace("\\", "/").strip()
        if not posix:
            continue
        suffix = Path(posix.rstrip("/")).suffix.lower()
        if suffix in LINTABLE or posix.endswith("/"):
            return True
    return False


def block(reason: str) -> None:
    json.dump({"decision": "block", "reason": reason}, sys.stdout)


def main() -> int:
    payload = payload_from_stdin()
    if payload.get("stop_hook_active") is True:
        return 0

    root = repo_root()
    if not lintable_changes(root):
        return 0

    result = subprocess.run(
        ["npm", "run", "lint"],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode == 0:
        return 0

    combined = "\n".join(
        part for part in (result.stdout, result.stderr) if part
    ).strip()
    if len(combined) > REASON_TAIL:
        combined = combined[-REASON_TAIL:]
    block(
        "npm run lint failed. Fix the errors below, then you may stop.\n\n"
        + (combined or f"exit {result.returncode}")
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
