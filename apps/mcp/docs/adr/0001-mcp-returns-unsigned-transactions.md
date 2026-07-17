---
status: accepted
---

# MCP returns unsigned transactions and never holds keys

The MCP server reads chain state and, for writes, returns **unsigned** transaction payloads (`{ to, data, value, step }`) for the calling agent to sign and broadcast with its own key. The server holds no private keys and never signs or sends — the only wallet/signer code in the context lives in the test harness impersonating an agent.

We chose this over server-side signing because holding keys would make the MCP server a custodian of user funds and a single high-value compromise target. Keeping signing entirely on the agent side means the server can be stateless and non-custodial, at the cost of a two-step flow (approve USDC, then purchase) the agent must execute itself.

## Consequences

- Do not add `createWalletClient`, an `account`, or any key/mnemonic env var to `apps/mcp/src`. A future change that makes the server sign transactions contradicts this ADR — revisit it explicitly rather than "helpfully" adding signing.
