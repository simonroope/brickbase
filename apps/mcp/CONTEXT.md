# MCP

The Model Context Protocol server that exposes Brickbase smart-contract reads and a share-purchase transaction builder to AI agents. It reads chain state via a viem `publicClient` and returns data or unsigned transactions — it never signs.

## Signing posture

**Unsigned transaction payload**:
The output of the purchase tool: `{ to, data, value, step }` objects the agent signs and broadcasts with its *own* key. The server holds no private keys and never signs or sends.
_Avoid_: signed transaction, execute, submit

**PurchaseTransactionPayload**:
The two-step unsigned payload for buying shares — `step` is `approve_usdc` then `purchase_asset_shares`.

## Tools

**get_asset_list**:
All tokenised assets from AssetVault, as `AssetSummary[]`.

**get_asset_detail**:
One asset by `assetId`, including resolved off-chain metadata.

**get_oracle_prices**:
The four OracleRouter feeds: ETH/USD, GBP/USD, Gold/USD, FTSE 100.

**get_user_shares**:
A user's share balance for a given asset.

**get_user_allowlist_status / get_allowlisted_users**:
Allowlist membership for one address, and the full set of allowed addresses (reconstructed from `UserAllowlistUpdated` events).
_Avoid_: whitelist (tool names, titles, and the JSON `allowlisted` field all use allowlist to match the on-chain contract)

**purchase_asset_shares**:
Builds the unsigned approve+purchase payload for `amount` shares. The only write-shaped tool; it never broadcasts.

## Resources

**config://deployments**:
The resource returning deployed contract addresses plus `chainId` / `rpcUrl`.

**contract://\<Name>/abi**:
The ABI resource per core contract (AssetVault, AssetShares, OracleRouter, AssetUserAllowList), served from `@brickbase/abi`.

## Data

**AssetSummary**:
The per-asset DTO the server returns: `assetId`, `status`, `capitalValue`, `incomeValue`, `metadataUri`, and the share fields (`totalSupply`, `availableSupply`, `sharePrice`, `tradingEnabled`).
