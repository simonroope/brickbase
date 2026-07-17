---
status: accepted
---

# Events pipeline is display-only and never reads contract state

The events pipeline (`ingest` → Redis → `gateway` → browser) carries only exogenous market data (Coinbase ticker) and generic chain liveness (Infura `newHeads` block heads). It does not call contracts, decode logs into contract state, or depend on any web3/contract SDK.

We drew this boundary deliberately: authoritative RWA/contract state is read on demand via viem in Web and MCP, where correctness and freshness matter. The live feed is a low-stakes, high-frequency UX layer, so keeping it contract-free avoids coupling a display concern to contract ABIs and RPC read budgets.

## Consequences

- The `chain_log` message type is reserved for future EVM log streaming but is intentionally not produced or wired to a channel today.
- Adding contract reads to this context crosses the boundary — revisit this ADR first.
