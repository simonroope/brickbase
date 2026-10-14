#!/usr/bin/env python3
"""PostToolUse (Edit|Write): rustfmt .rs files; eslint --fix on TS/JS."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

SKIP_PARTS = (
    "/node_modules/",
    "/.next/",
    "/target/",
    "/dist/",
    "/artifacts/",
    "/typechain-types/",
    "/contracts/abi/src/generated/",
    "/contracts/lib/",
)

TS_JS_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}


def payload_from_stdin() -> dict:
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def file_path_from_payload(payload: dict) -> Path | None:
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return None
    raw = tool_input.get("file_path")
    if not isinstance(raw, str) or not raw.strip():
        return None
    return Path(raw.replace("\\", "/"))


def should_skip(path: Path) -> bool:
    posix = f"/{path.as_posix().lstrip('/')}"
    return any(part in posix for part in SKIP_PARTS)


def repo_root() -> Path:
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2]


def run(argv: list[str], cwd: Path) -> None:
    subprocess.run(argv, cwd=cwd, check=False)


def main() -> int:
    path = file_path_from_payload(payload_from_stdin())
    if path is None or should_skip(path) or not path.is_file():
        return 0

    root = repo_root()
    suffix = path.suffix.lower()
    if suffix == ".rs":
        run(["rustfmt", str(path)], cwd=root)
    elif suffix in TS_JS_SUFFIXES:
        run(["npx", "eslint", "--fix", str(path)], cwd=root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
