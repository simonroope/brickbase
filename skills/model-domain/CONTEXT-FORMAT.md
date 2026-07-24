# CONTEXT.md Format

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**AssetVault**:
The on-chain registry of tokenised properties. Each vaulted property is represented as a single ERC-721 NFT with an on-chain status and metadata URI.
_Avoid_: Property contract, NFT contract, token

**AssetShares**:
The ERC-1155 contract that issues fungible fractional ownership shares for each vaulted asset. Purchases are settled in USDC.
_Avoid_: Share token, fractional NFT, ERC-20 shares

**Allowlist**:
The `AssetUserAllowList` contract that gates participation. Only allowlisted addresses may hold shares or interact with AssetVault.
_Avoid_: Whitelist, KYC list, approved list
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `_Avoid_`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Only include terms specific to this context.** General Solidity/EVM concepts (gas, ABI, event, modifier), general TypeScript patterns, and general Next.js concepts don't belong even if used extensively. Before adding a term, ask: is this concept unique to this bounded context, or a general programming concept? Only the former belongs.
- **Group terms under subheadings** when natural clusters emerge (e.g. `## Contracts`, `## Roles`, `## Feeds`).

## Brickbase context map

Brickbase is a multi-context monorepo. `CONTEXT-MAP.md` at the repo root lists all contexts and their relationships:

```md
# Context Map

## Contexts

- [Contracts](./libs/contracts/CONTEXT.md) — on-chain assets, shares, allowlist, oracle
- [Web](./apps/web/CONTEXT.md) — investor portal: property display and share purchase UI
- [MCP](./apps/mcp/CONTEXT.md) — AI agent tools and resources over the smart contracts
- [Events](./apps/events/CONTEXT.md) — live market and chain data feeds pipeline
- [ABI](./libs/abi/CONTEXT.md) — compiled ABI types and import conventions
- [Shared Config](./libs/shared-config/CONTEXT.md) — chain IDs, RPC URL construction

## Relationships

- **Contracts → Web**: Web reads contract state via viem; contract addresses injected at build time via next.config.ts env block
- **Contracts → MCP**: MCP reads contract state and returns unsigned transaction payloads for agents to sign
- **Events → Web**: Ingest publishes to Redis; Gateway exposes a WebSocket; Web subscribes via useLiveFeedWebSocket
- **Contracts → Events**: Ingest subscribes to Infura newHeads for block events; chain ID flows from shared-config
- **Shared Config → Web, MCP, Events**: All services consume ETHEREUM_RPC_URL and CHAIN_ID from shared-config
```

The skill infers which context the current topic relates to from the files being edited or discussed. If unclear, ask.

When a term is resolved in a session, update the relevant context's `CONTEXT.md` immediately — do not batch.