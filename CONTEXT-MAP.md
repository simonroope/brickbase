# Context Map

Brickbase is a multi-context monorepo for fractional real-estate RWA investing on Ethereum. Each context below owns its own glossary (`CONTEXT.md`) and, where decisions have been recorded, its own `docs/adr/`.

## Contexts

- [Contracts](./libs/contracts/CONTEXT.md) — on-chain assets, fractional shares, allowlist, oracle
- [Web](./apps/web/CONTEXT.md) — investor portal: property display, share purchase, admin
- [MCP](./apps/mcp/CONTEXT.md) — AI-agent tools and resources over the smart contracts
- [Events](./apps/events/CONTEXT.md) — display-only live market and chain-head feeds pipeline
- [ABI](./libs/abi/CONTEXT.md) — compiled ABI exports and import conventions
- [Shared Config](./libs/shared-config/CONTEXT.md) — supported chains, RPC URL construction
- [Test Seed](./libs/test-seed/CONTEXT.md) — deterministic Hardhat test signers

## Relationships

- **Contracts → Web**: Web reads contract state via a viem `publicClient`; deployment addresses are env-driven per app (`apps/web/src/lib/config.ts`).
- **Contracts → MCP**: MCP reads contract state via viem and returns **unsigned** transaction payloads; it never signs or holds keys.
- **ABI → Web, MCP, Test Seed**: All consumers import typed ABIs from `@brickbase/abi`; the raw `generated/*.json` artifacts (copied from Contracts) are never imported directly.
- **Shared Config → Web, MCP, Events**: All services resolve RPC URLs via `getChainConfig` / `appendProjectId`, appending `INFURA_PROJECT_ID` onto a base `ETHEREUM_RPC_URL`.
- **Events → Web**: Ingest publishes normalised `LiveFeedMessage`s to Redis; Gateway relays them over a WebSocket; Web subscribes via `useLiveFeedWebSocket`. Display-only — no contract state flows through this path.
- **Events ↔ Contracts**: None. The events pipeline consumes exogenous market data (Coinbase) and generic chain liveness (Infura `newHeads`) only; it does not read contracts.
