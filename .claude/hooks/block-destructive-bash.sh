#!/usr/bin/env python3
"""PreToolUse (Bash): ask for rm -rf; deny git push --force and DROP TABLE."""

from __future__ import annotations

import json
import re
import sys

DENY = (
    (
        re.compile(r"\bgit\s+push\b(?:(?!&&|\|\||;).)*?(?:\s--force\b|\s-f\b)", re.S),
        "git push --force",
    ),
    (re.compile(r"\bDROP\s+TABLE\b", re.I), "DROP TABLE"),
)

ASK = ((re.compile(r"\brm\s+-[^\s]*[rf][^\s]*[fr]\b"), "rm -rf"),)


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


def decide(decision: str, reason: str) -> None:
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": decision,
                "permissionDecisionReason": reason,
            }
        },
        sys.stdout,
    )


def main() -> int:
    command = command_from_stdin()
    for pattern, label in DENY:
        if pattern.search(command):
            decide("deny", f"{label} is blocked by a PreToolUse Bash hook")
            return 0
    for pattern, label in ASK:
        if pattern.search(command):
            decide("ask", f"{label} requires confirmation")
            return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
