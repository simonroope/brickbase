---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when the user wants to pin down domain terminology or a ubiquitous language, record an architectural decision, or when another skill needs to maintain the domain model.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active* discipline — challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `CONTEXT.md` for vocabulary is not this skill — that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## File structure

Brickbase is a **multi-context monorepo**. `CONTEXT-MAP.md` at the repo root points to each context:

```
/
├── CONTEXT-MAP.md                        ← index of all contexts
├── docs/
│   └── adr/                              ← system-wide decisions
├── apps/
│   ├── web/
│   │   ├── CONTEXT.md                    ← Next.js investor portal domain
│   │   └── docs/adr/
│   ├── mcp/
│   │   ├── CONTEXT.md                    ← MCP server / AI agent tools domain
│   │   └── docs/adr/
│   └── events/
│       ├── CONTEXT.md                    ← live feeds pipeline domain
│       └── docs/adr/
└── libs/
    ├── contracts/
    │   ├── CONTEXT.md                    ← smart contract domain (AssetVault, AssetShares, OracleRouter, AssetUserAllowList)
    │   └── docs/adr/
    ├── abi/
    │   └── CONTEXT.md                    ← ABI types and import conventions
    └── shared-config/
        └── CONTEXT.md                    ← chain config, RPC URL conventions
```

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists for a context, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'asset' as a vaulted property NFT, but you seem to mean the ERC-1155 share token — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'token' — do you mean the AssetVault NFT (ERC-721), the AssetShares balance (ERC-1155), or the USDC payment token (ERC-20)? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code calls `setAuthorizedCaller` on AssetUserAllowList for both AssetVault and AssetShares, but you said only AssetVault checks allowlist membership — which is right?"

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
