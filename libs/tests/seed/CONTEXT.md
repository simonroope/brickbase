# Test Seed

Deterministic Hardhat test signers, shared across test suites. Despite the name, "seed" refers to a **mnemonic seed phrase** — this library seeds *accounts*, not on-chain assets, shares, or allowlist data.

## Language

**HARDHAT_MNEMONIC**:
The well-known public Hardhat test mnemonic used to derive dev-chain accounts deterministically. Not project-specific and never used in production.

**Signer roles**:
The named accounts derived from the mnemonic: `deployerAccount` (index 0, deploys contracts in tests), `signer1` (index 1), and `agentAccount` (index 2, the automated/MCP agent actor in tests).
_Avoid_: reading "seed" as demo-data generation; "bot" for the agent account
