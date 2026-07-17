# Web

The Next.js investor portal: browse tokenised properties, buy fractional shares with USDC, view holdings, and (for operators) manage the allowlist. Reads on-chain state via a viem `publicClient`.

## Assets & properties

**Asset**:
The tokenised on-chain entity, surfaced to the UI as `AssetSummary` (on-chain fields merged with off-chain `metadata`). Use "Asset" for types, data, and identifiers.
_Avoid_: property (as a data/type name)

**Property**:
The real-world building an Asset represents — the user-facing framing (e.g. the `/asset-property` route, "Back to properties"). A display label, not a data type.
_Avoid_: using "property" and "asset" interchangeably in code

**AssetSummary**:
The list/card view model of an Asset: `assetId`, `status`, `capitalValue`, `incomeValue`, `metadataUri`, share fields, plus resolved `metadata`.

**AssetMetadata**:
The off-chain JSON (from `metadataUri`, typically IPFS) describing a property: name, address, area, images, documents, etc.

**ASSET_STATUS**:
The UI badge mapping of the on-chain status enum: Active, Under Contract, Sold, Suspended.

## Buying & holdings

**Buy Shares**:
The purchase surface and its two-step transaction: USDC `approve`, then `purchaseAssetShares`. Gated on allowlist membership and available supply.
_Avoid_: purchase (unqualified), checkout

**Total cost**:
The USDC due for a prospective purchase: `amount * sharePrice / 1e18`.

**Your balance**:
A connected user's share holding in one asset (the `balance_` field of `getUserShares`). This is the app's position concept — there is no aggregated portfolio view.
_Avoid_: portfolio, position

**USDC**:
The 6-decimal ERC-20 settlement currency; approved to AssetShares before a purchase.

## Live feed (display-only)

**Live feed**:
The real-time WebSocket data shown in the header, consumed via `useLiveFeedWebSocket`. Explicitly display-only — never used to drive on-chain transactions.
_Avoid_: using live-feed prices as on-chain values

**LiveTicker**:
The header strip rendering the live feed: Coinbase ETH/USD spot price, latest chain-head block, and a status dot.

**LiveFeedStatus**:
The feed's connection state: `live`, `delayed` (connected but stale >10s), or `offline`.

**Oracle prices**:
The authoritative on-chain Chainlink values from OracleRouter (ETH/USD, GBP/USD, Gold/USD, FTSE 100), polled on an interval. Distinct from — and not to be confused with — the display-only LiveTicker spot price.
_Avoid_: conflating oracle prices with the live ticker

## Compliance & admin

**Allowlist**:
The set of addresses permitted to buy shares, enforced at purchase time (browsing is public). The canonical term, matching the on-chain `AssetUserAllowList`.
_Avoid_: whitelist

**Admin panel**:
The `/asset-admin` operator screen: allowlist management plus asset/share creation. Requires `COMPLIANCE_OFFICER_ROLE` for allowlist changes.
_Avoid_: dashboard
