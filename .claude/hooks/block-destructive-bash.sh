#!/usr/bin/env python3
"""PreToolUse (Bash): ask for rm -rf and mutating git branch; deny force-push and DROP TABLE."""

from __future__ import annotations

import json
import re
import shlex
import sys

DENY = (
    (
        re.compile(r"\bgit\s+push\b(?:(?!&&|\|\||;).)*?(?:\s--force\b|\s-f\b)", re.S),
        "git push --force",
    ),
    (re.compile(r"\bDROP\s+TABLE\b", re.I), "DROP TABLE"),
)

ASK = ((re.compile(r"\brm\s+-[^\s]*[rf][^\s]*[fr]\b"), "rm -rf"),)

GIT_BRANCH = re.compile(r"\bgit\s+branch\b((?:(?!&&|\|\||;).)*)", re.S)

MUTATE_LONG = {
    "--copy",
    "--create-reflog",
    "--delete",
    "--edit-description",
    "--force",
    "--move",
    "--no-track",
    "--set-upstream-to",
    "--track",
    "--unset-upstream",
}

VALUE_LONG = {
    "--abbrev",
    "--color",
    "--column",
    "--contains",
    "--format",
    "--list",
    "--merged",
    "--no-contains",
    "--no-merged",
    "--points-at",
    "--set-upstream-to",
    "--sort",
}

MUTATE_SHORT = set("dDmMcCuf")


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


def git_branch_mutates(args: str) -> bool:
    try:
        tokens = shlex.split(args)
    except ValueError:
        return True
    i = 0
    while i < len(tokens):
        token = tokens[i]
        if token.startswith("--"):
            name = token.split("=", 1)[0]
            if name in MUTATE_LONG:
                return True
            if name in VALUE_LONG and "=" not in token:
                i += 2
                continue
            i += 1
            continue
        if token.startswith("-") and token != "-":
            if any(letter in MUTATE_SHORT for letter in token[1:]):
                return True
            i += 1
            continue
        return True
    return False


def mutating_git_branch(command: str) -> bool:
    return any(git_branch_mutates(match.group(1)) for match in GIT_BRANCH.finditer(command))


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
    if mutating_git_branch(command):
        decide("ask", "git branch create/delete/rename requires confirmation")
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
