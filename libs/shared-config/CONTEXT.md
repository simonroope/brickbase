# Shared Config

Supported chains and RPC URL construction, imported as `@brickbase/shared-config`. Consumed by Web, MCP, and Events to resolve which chain and RPC endpoint to use.

## Language

**SUPPORTED_CHAIN_IDS**:
The readonly tuple of chains Brickbase supports: `1` (Ethereum mainnet), `11155111` (Sepolia), `8453` (Base), `84532` (Base Sepolia). Source of the `ChainId` type.
_Avoid_: networks array, supported chains list

**getChainConfig**:
Resolves a `ChainId` to `{ rpcUrl, name }`, applying `appendProjectId` over an env URL with a public-node fallback. Returns config, not a viem `Chain`.
_Avoid_: getChain, chain definition

**appendProjectId**:
Concatenates `INFURA_PROJECT_ID` onto an RPC base URL that must already end in `/`; returns the URL unchanged when the env var is unset.
_Avoid_: build RPC URL, add key (it inserts no separator and no `?key=`)

**ETHEREUM_RPC_URL / BASE_RPC_URL**:
The base RPC URLs — Ethereum mainnet + Sepolia share `ETHEREUM_RPC_URL`; both Base chains share `BASE_RPC_URL`. Always a base URL ending in `/`; never a complete keyed URL.
_Avoid_: normalising or trimming the trailing slash

**INFURA_PROJECT_ID**:
The Infura key appended at runtime — a server-only secret (sourced from AWS SSM), never baked into the RPC URL. Optional: Events skips Infura `newHeads` when unset.
_Avoid_: Infura API key baked into the URL
