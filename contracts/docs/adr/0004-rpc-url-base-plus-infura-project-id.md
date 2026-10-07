---
status: accepted
---

# RPC URL is a base URL; INFURA_PROJECT_ID is appended at runtime

`RPC_URL` is this environment's JSON-RPC **base URL ending in `/`** (e.g. `https://sepolia.infura.io/v3/` in staging, `http://127.0.0.1:8545` locally). The Infura hostname selects the chain; `INFURA_PROJECT_ID` is chain-agnostic. `appendProjectId` concatenates `INFURA_PROJECT_ID` onto the end at runtime with no separator; the Infura base URL must supply the trailing slash.

`INFURA_PROJECT_ID` is a server-only secret held in AWS SSM and injected as an env var — it is never baked into the stored RPC URL. This keeps the key out of committed config and shared base URLs, at the cost of a construction step every consumer must go through (`getChainConfig` / `appendProjectId`).

## Consequences

- Do not normalise, trim, or "fix" the trailing slash on the base URL, and do not embed the project ID in the URL — either change silently breaks RPC resolution.
- When `INFURA_PROJECT_ID` is unset, the base URL is used as-is. Events uses Hardhat `newHeads` on loopback `RPC_URL` and skips Infura `newHeads` on remote URLs.
