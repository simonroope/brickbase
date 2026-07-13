# Brickbase — Agent Guide

Nx monorepo for fractional RWA investing on Ethereum: EVM smart contracts, MCP server, events layer (live feeds), and a Next.js investor portal.

See `README.md` for full project documentation.

## Structure

| Path          | Description                                                 |
|---------------|-------------------------------------------------------------|
| `apps/web`    | Next.js investor portal (App Router, Tailwind, wagmi, viem) |
| `apps/mcp`    | MCP server — AI agent tools + resources for smart contracts |
| `apps/events` | Live feeds: `ingest/` (upstream → Redis), `gateway/` (Redis → browser), `types/` |
| `libs/contracts` | Solidity smart contracts (Hardhat): AssetVault, AssetShares, OracleRouter, AssetUserAllowList |
| `libs/abi`    | Compiled ABIs — import as `@brickbase/abi` |
| `libs/shared-config` | Chain config, RPC helpers — import as `@brickbase/shared-config` |

## Conventions

- Use `@brickbase/abi` for contract ABIs in `apps/web` and `apps/mcp` — never import by relative path
- Contract addresses use canonical names (`ASSET_VAULT_ADDRESS` etc.)
- `ETHEREUM_RPC_URL` is the base URL ending with `/`; `INFURA_PROJECT_ID` is appended at runtime
- Nx targets: `nx run web:build`, `nx run contracts:compile`, `nx run mcp:serve`, `nx run events:ingest`, `nx run events:gateway`
- Shared lib imports via tsconfig paths (`@brickbase/abi`, `@brickbase/events-types`); no per-lib `package.json` unless the lib is published
- `tsx` is the runtime for `apps/mcp`, `ingest`, and `gateway` — no compile step
- Dynamic API routes in Next.js must export `export const dynamic = "force-dynamic"`

## Skills

Skills live in `.claude/skills/` (source of truth). Invocation:

| Agent       | Prefix | Example |
|-------------|--------|-----------|
| Claude Code | `/`    | `/handoff` |
| Codex       | `$`    | `$handoff` |

Available skills:

| Skill                           | Description                                                                                                     |
|---------------------------------|-----------------------------------------------------------------------------------------------------------------|
| `build-code`                    | Implement a spec or set of tickets using TDD, run type-checking and tests, then self-review with `code-review` |
| `codebase-design`               | Deep-module vocabulary — design and improve module interfaces, find seams, improve testability                  |
| `code-review`                   | Review changes since a fixed point (commit, branch, tag) against coding standards and the originating issue/PRD |
| `create-prd`                    | Synthesise conversation into a PRD (requires `docs/agents/issue-tracker.md`)                                   |
| `create-tickets`                | Break a plan into GitHub issues with BDD acceptance criteria (requires `docs/agents/issue-tracker.md`)         |
| `domain-modeling`               | Build and maintain `CONTEXT.md` and ADRs                                                                        |
| `elicit`                        | Interview to sharpen a design or plan                                                                           |
| `elicit-requirements`           | Requirements elicitation using the domain model                                                                 |
| `handoff`                       | Generate a session handoff document                                                                             |
| `improve-codebase-architecture` | Surface architectural friction, generate HTML report                                                            |
| `research`                      | Investigate a question against primary sources and capture findings as a Markdown file in the repo              |
| `tdd`                           | TDD loop — red → green → refactor                                                                               |
| `triage`                        | Move issues through the triage state machine — categorise, verify, and write agent-ready briefs                 |

Skill files live at `.claude/skills/<name>/SKILL.md`.

Codex reads skills from `.codex/skills/` (pointer files that reference `.claude/skills/`).

Run `npm run skills:sync` after adding a new skill to `.claude/skills/` to register it in `.codex/skills/`.

## Coding standards

Full standards by pillar (Foundations, Architecture, Style, Types & Schemas, Tooling) and by layer are in `docs/agents/coding-standards.md`. The `code-review` and `tdd` skills read this file as their primary standards source.

## Process

Workflow disciplines — spec first, definition of done, continuous quality feedback, shift left, leave it better, short-lived branches — are in `docs/agents/process.md`. Read it at the start of any implementation session.

## Issue tracker

Issues are tracked in GitHub Issues via the `gh` CLI. Infer the repo from `git remote -v`. External PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

## Triage labels

Default label vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

## Domain docs

Multi-context (monorepo) — `CONTEXT-MAP.md` at the repo root points to per-context `CONTEXT.md` files under each `apps/*` and `libs/*`. See `docs/agents/domain.md`.
