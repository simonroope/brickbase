#!/usr/bin/env python3
"""PreToolUse (Bash): deny rm -rf, git push --force, and DROP TABLE."""

from __future__ import annotations

import json
import re
import sys

CHECKS = (
    (re.compile(r"\brm\s+-[^\s]*[rf][^\s]*[fr]\b"), "rm -rf"),
    (
        re.compile(r"\bgit\s+push\b(?:(?!&&|\|\||;).)*?(?:\s--force\b|\s-f\b)", re.S),
        "git push --force",
    ),
    (re.compile(r"\bDROP\s+TABLE\b", re.I), "DROP TABLE"),
)


def command_from_stdin() -> str:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return ""
    tool_input = payload.get("tool_input") or {}
    if not isinstance(tool_input, dict):
        return ""
    command = tool_input.get("command")
    return command if isinstance(command, str) else ""


def deny(reason: str) -> None:
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": f"{reason} is blocked by a PreToolUse Bash hook",
            }
        },
        sys.stdout,
    )


def main() -> int:
    command = command_from_stdin()
    for pattern, label in CHECKS:
        if pattern.search(command):
            deny(label)
            return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
