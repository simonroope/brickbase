# Brickbase — Agent Guide

Nx monorepo for fractional RWA investing on Ethereum: EVM smart contracts, MCP server, events layer (live feeds), and a Next.js investor portal.

See `README.md` for full project documentation.

## Skills

Skills live in `.claude/skills/` (source of truth). Invocation:

| Agent | Prefix | Example |
|---|---|---|
| Claude Code | `/` | `/handoff` |
| Codex | `$` | `$handoff` |

Available skills:

```
.claude/skills/
  domain-modeling/SKILL.md
  elicit-requirements/SKILL.md
  elicit/SKILL.md
  handoff/SKILL.md
  improve-codebase-architecture/SKILL.md
  build-with-tdd/SKILL.md
  create-tickets/SKILL.md — requires docs/agents/issue-tracker.md + triage-labels.md
  create-prd/SKILL.md    — requires docs/agents/issue-tracker.md + triage-labels.md
```

Codex reads skills from `.codex/skills/` (pointer files that reference `.claude/skills/`).

Run `npm run skills:sync` after adding a new skill to `.claude/skills/` to register it in `.codex/skills/`.

## Issue tracker

Issues are tracked in GitHub Issues via the `gh` CLI. Infer the repo from `git remote -v`. External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

## Triage labels

Default label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

## Domain docs

Multi-context (monorepo) — `CONTEXT-MAP.md` at the repo root points to per-context `CONTEXT.md` files under each `apps/*` and `libs/*`. See `docs/agents/domain.md`.
