# Contracts

The on-chain core of Brickbase: Solidity contracts (Hardhat) that tokenise real-estate assets, issue fractional ownership shares settled in USDC, gate participation behind a compliance allowlist, and route price feeds.

## Contracts

**AssetVault**:
The ERC-721 registry of tokenised assets. Each vaulted asset is one NFT whose record carries status, valuations, and a metadata URI. Implements the EIP-7943 non-fungible compliance hooks.
_Avoid_: property contract, NFT contract, token

**AssetShares**:
The ERC-1155 contract that issues fungible fractional ownership shares per asset, keyed by `assetId`. Purchases and trades are settled in USDC. Implements the EIP-7943 multi-token compliance hooks.
_Avoid_: share token, fractional NFT, ERC-20 shares

**AssetUserAllowList**:
The single shared contract holding the set of allowed addresses. It exposes reads/writes only to authorised caller contracts (AssetVault, AssetShares); the caller enforces the compliance role.
_Avoid_: whitelist, KYC list, approved list

**OracleRouter**:
The contract that routes price queries to Chainlink aggregators for ETH/USD, GBP/USD, Gold/USD, and the FTSE 100.
_Avoid_: price oracle, feed contract

## Asset model

**Asset**:
The on-chain record held per NFT in AssetVault: `status`, `capitalValue`, `incomeValue`, `metadataURI`, and timestamps.
_Avoid_: property (reserve "property" for the real-world building as shown in the UI, not the on-chain record)

**assetId**:
The shared identity for one asset across contracts — it is both the AssetVault NFT `tokenId` and the AssetShares ERC-1155 token id.
_Avoid_: tokenId (ambiguous across the two token standards)

**AssetStatus**:
The lifecycle enum on an Asset: `Active`, `UnderContract`, `Sold`, `Suspended`.

**capitalValue / incomeValue**:
The two independent valuations carried per Asset — capital worth versus income-based worth. Denominated in USDC decimals (typically 6).
_Avoid_: price, value (unqualified)

**metadataURI**:
The URI on an Asset pointing to off-chain JSON (address, purchase price, area, images, documents).

## Shares model

**ShareInfo**:
The per-asset share record in AssetShares: `totalSupply`, `availableSupply`, `sharePrice`, `tradingEnabled`, and timestamps.

**sharePrice**:
The per-share price in USDC decimals. Shares are 18-decimal; USDC is 6-decimal, so cost is `amount * sharePrice / 1e18`.

**Primary market**:
Buying unsold shares directly from AssetShares via `purchaseAssetShares` — USDC moves to the contract and shares are minted to the buyer, drawing down `availableSupply`.
_Avoid_: mint, issue (from the buyer's perspective it is a purchase)

**Secondary market**:
Peer-to-peer resale of held shares via `tradeShares` — the buyer pays the seller in USDC directly. Requires `tradingEnabled` for the asset.
_Avoid_: transfer (unqualified), sell

**Freeze**:
A compliance hold. In AssetVault a whole NFT (`tokenId`) is frozen; in AssetShares a per-user share *amount* is frozen, blocking that quantity from transfer while the rest stays usable.
_Avoid_: lock, ban

## Roles

**ASSET_MANAGER_ROLE**:
Creates assets and manages share supply, pricing, and trading status.

**COMPLIANCE_OFFICER_ROLE**:
Manages the allowlist and executes compliance actions (freeze, forced transfer).

**MINTER_ROLE**:
Granted to AssetVault; the only role permitted to create an asset's shares in AssetShares.

**PAUSER_ROLE**:
Granted once to a multisig `pauser`; controls pause/unpause of transfers.

**Authorised caller**:
A contract permitted to read/write AssetUserAllowList. Distinct from a role — it is address-based authorisation set by the allowlist admin.
_Avoid_: authorized user, admin

## Compliance

**EIP-7943 (uRWA) hooks**:
The regulated-RWA compliance interface implemented by AssetVault and AssetShares: `isUserAllowed`, `canTransact`, `canTransfer`, freeze inspection, and `forcedTransfer`.
_Avoid_: ERC-7943 (spec is an EIP), compliance interface (unqualified)
