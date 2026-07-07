# ADR Format

ADRs live in `docs/adr/` (system-wide) or `<context>/docs/adr/` (context-scoped) and use sequential numbering: `0001-slug.md`, `0002-slug.md`, etc.

Create the `docs/adr/` directory lazily — only when the first ADR is needed.

## Template

```md
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

That's it. An ADR can be a single paragraph. The value is in recording *that* a decision was made and *why* — not in filling out sections.

## Optional sections

Only include these when they add genuine value. Most ADRs won't need them.

- **Status** frontmatter (`proposed | accepted | deprecated | superseded by ADR-NNNN`) — useful when decisions are revisited
- **Considered Options** — only when the rejected alternatives are worth remembering
- **Consequences** — only when non-obvious downstream effects need to be called out

## Numbering

Scan the relevant `docs/adr/` directory for the highest existing number and increment by one.

## When to offer an ADR

All three of these must be true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will look at the code and wonder "why on earth did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If a decision is easy to reverse, skip it. If it's not surprising, nobody will wonder why. If there was no real alternative, there's nothing to record beyond "we did the obvious thing."

## What qualifies

- **Smart contract architecture.** "AssetShares settles in USDC via ERC-20 approve/transferFrom rather than native ETH." "AssetUserAllowList authorises callers rather than storing allowlists per contract."
- **EIP / standard choices.** "AssetShares implements ERC-1155 rather than multiple ERC-20s." "AssetVault implements EIP-7943 uRWA compliance hooks." Why these standards and not alternatives.
- **Cross-context integration patterns.** "MCP returns unsigned transaction payloads — it never holds private keys." "Events layer is display-only; it does not read from contracts." "Web app bakes env vars at build time via next.config.ts rather than reading SSM at runtime."
- **Chain and network decisions.** "Production targets Ethereum mainnet; staging targets Sepolia." "Base chain is supported but secondary." Anything that affects which Chainlink feed addresses or USDC addresses are used.
- **Infrastructure choices that carry lock-in.** "ECS Fargate over EKS." "ElastiCache Redis for pub/sub." "ECR for container images." Not every npm package — only things that would take meaningful effort to replace.
- **RPC and secrets patterns.** "ETHEREUM_RPC_URL is always the base URL ending with `/`; INFURA_PROJECT_ID is appended at runtime." "INFURA_PROJECT_ID is stored in AWS SSM, not as a plaintext ECS env var." Anything a future engineer could accidentally break by normalising the URL or moving the secret.
- **Deliberate deviations from the obvious path.** "MCP and events services run TypeScript directly via tsx rather than compiling to JS." "No per-lib package.json except for published libs." Anything where a reasonable engineer would assume the opposite.
- **Regulatory and compliance constraints.** "EIP-7943 uRWA compliance hooks are non-negotiable — they enforce allowlist checks and freeze capability required by regulated RWA issuance." Constraints not visible from the code alone.
