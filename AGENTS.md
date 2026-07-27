# Brickbase — Agent Guide

Nx monorepo for fractional RWA investing on Ethereum: EVM smart contracts, MCP server, events layer (live feeds), and a Next.js investor portal.

## Structure

| Path          | Description                                                 |
|---------------|-------------------------------------------------------------|
| `apps/web`    | Next.js investor portal (App Router, Tailwind, wagmi, viem) |
| `apps/mcp`    | MCP server — AI agent tools + resources for smart contracts |
| `apps/events` | Live feeds: `ingest/` (upstream → Redis), `gateway/` (Redis → browser), `types/` |
| `workflows`   | Temporal worker — scans `ready-for-agent` issues, resolves `Blocked by` / `Blocks` dependency edges, and runs `build-code` in topological order (parallel where possible) in isolated git worktrees |
| `skills/`     | Agent skills — source of truth. Run `npm run skills:sync` after adding a skill |
| `libs/contracts` | Solidity smart contracts (Hardhat): AssetVault, AssetShares, OracleRouter, AssetUserAllowList |
| `libs/abi`    | Compiled ABIs — import as `@brickbase/abi` |
| `libs/shared-config` | Chain config, RPC helpers — import as `@brickbase/shared-config` |

## Conventions

Conventions (imports and paths, env vars, and per-layer rules) live in `docs/agents/coding-standards.md`.

## Skills

Skills live in `skills/` (source of truth). Invocation:

| Agent       | Prefix | Example |
|-------------|--------|-----------|
| Claude Code | `/`    | `/build-code` |
| Codex       | `$`    | `$build-code` |

Available skills:

| Skill                           | Description                                                                                                     |
|---------------------------------|-----------------------------------------------------------------------------------------------------------------|
| `build-code`                    | Implement a spec or set of tickets using TDD, run type-checking and tests, then self-review with `code-review` |
| `code-review`                   | Review changes since a fixed point (commit, branch, tag) against coding standards and the originating ticket/PRD |
| `create-prd`                    | Synthesise conversation into a PRD (requires `docs/agents/ticket-tracker.md`)                                  |
| `create-tickets`                | Break a plan into GitHub ticket with BDD acceptance criteria (requires `docs/agents/ticket-tracker.md`)        |
| `model-domain`                  | Build and maintain `CONTEXT.md` and ADRs                                                                        |
| `elicit`                        | Interview to sharpen a design or plan                                                                           |
| `elicit-requirements`           | Requirements elicitation using the domain model                                                                 |
| `tdd`                           | TDD loop — red → green → refactor                                                                               |
Skill files live at `skills/<name>/SKILL.md`.

`npm run skills:sync` syncs pointers from `skills/` to three targets:

| Target | Pointer type | Consumer |
|---|---|---|
| `.claude/skills/` | Relative | Claude CLI (repo-local) |
| `.codex/skills/` | Relative | Codex (repo-local) |
| `~/.claude/skills/` | Absolute | Claude CLI (global) |

Run it after adding or amending a skill.

## Coding standards

Full standards by pillar (Foundations, Architecture, Style, Types & Schemas, Tooling) and by layer are in `docs/agents/coding-standards.md`. The `code-review` and `tdd` skills read this file as their primary standards source.

## Process

Workflow disciplines — spec first, definition of done, continuous quality feedback, shift left, leave it better, short-lived branches — are in `docs/agents/process.md`. Read it at the start of any implementation session.

## Ticket tracker

Tickets are tracked in GitHub Issues via the `gh` CLI. Infer the repo from `git remote -v`. External PRs are not a triage surface. See `docs/agents/ticket-tracker.md`.

Label vocabulary:

| Label               | Meaning                                  |
|---------------------|------------------------------------------|
| `needs-triage`      | Maintainer needs to evaluate this ticket |
| `needs-info`        | Waiting on reporter for more information |
| `ready-for-agent`   | Fully specified, ready for an AFK agent  |
| `ready-for-human`   | Requires human implementation            |
| `wontfix`           | Will not be actioned                     |


## Domain docs

Multi-context (monorepo) — `CONTEXT-MAP.md` at the repo root points to per-context `CONTEXT.md` files under each `apps/*` and `libs/*`. See `docs/agents/domain.md`.
