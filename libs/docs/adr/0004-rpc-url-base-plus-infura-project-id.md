---
status: accepted
---

# RPC URL is a base URL; INFURA_PROJECT_ID is appended at runtime

`ETHEREUM_RPC_URL` (and `BASE_RPC_URL`) are stored as **base URLs ending in `/`** (e.g. `https://sepolia.infura.io/v3/`). `appendProjectId` concatenates `INFURA_PROJECT_ID` onto the end at runtime with no separator; the base URL must supply the trailing slash.

`INFURA_PROJECT_ID` is a server-only secret held in AWS SSM and injected as an env var — it is never baked into the stored RPC URL. This keeps the key out of committed config and shared base URLs, at the cost of a construction step every consumer must go through (`getChainConfig` / `appendProjectId`).

## Consequences

- Do not normalise, trim, or "fix" the trailing slash on the base URL, and do not embed the project ID in the URL — either change silently breaks RPC resolution.
- When `INFURA_PROJECT_ID` is unset, the base URL is used as-is (Events skips Infura `newHeads` entirely).
