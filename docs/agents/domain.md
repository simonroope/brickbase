# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This is a **multi-context** monorepo: contexts live under `apps/*` (e.g. `apps/events`, `apps/mcp`, `apps/web`) and `libs/*` (e.g. `libs/abi`, `libs/contracts`, `libs/shared-config`, `libs/test-seed`).

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — it points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`<context>/CONTEXT.md`** — the per-context glossary under the relevant `apps/*` or `libs/*` directory.
- **`docs/adr/`** — system-wide architectural decisions. Read ADRs that touch the area you're about to work in.
- **`<context>/docs/adr/`** — context-scoped decisions under the relevant `apps/*` or `libs/*` directory.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/elicit-requirements` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT-MAP.md                      ← points to each context's CONTEXT.md
├── docs/adr/                           ← system-wide decisions
├── apps/
│   ├── events/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                   ← context-specific decisions
│   ├── mcp/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/
│   └── web/
│       ├── CONTEXT.md
│       └── docs/adr/
└── libs/
    ├── abi/
    │   └── CONTEXT.md
    ├── contracts/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    ├── shared-config/
    │   └── CONTEXT.md
    └── test-seed/
        └── CONTEXT.md
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant context's `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
