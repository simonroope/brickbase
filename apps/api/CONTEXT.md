# API

HTTP JSON API for contract reads and operator queries. It never holds a private key and never signs or broadcasts transactions.

## Signing posture

**Unsigned**:
The API does not submit transactions. Clients sign with their own keys, matching MCP.
_Avoid_: execute, submit, broadcast from this crate

## HTTP

**Health**:
`GET /health` returns `{ "status": "ok" }` with no RPC, database, or outbound HTTP.
_Avoid_: using health as a chain or database probe

**Assets**:
`GET /assets` returns mock `Asset` rows from Postgres (`DATABASE_URL`). JSON field names match MCP `AssetSummary`. Not on-chain.
_Avoid_: treating these rows as AssetVault state

**Route modules**:
HTTP handlers grouped by glossary term: assets, shares, oracles, allowlist.
_Avoid_: controllers, services, repositories as folder names

## Data

**Asset**:
A mock tokenised-asset row stored in Postgres and returned by `GET /assets`. Same JSON keys as MCP `AssetSummary` (`assetId`, `status`, `capitalValue`, …).
_Avoid_: AssetSummary as the API type name until the route reads AssetVault

**Config**:
Process configuration from canonical env names (`API_PORT`, `DATABASE_URL`, `CHAIN_ID`, `RPC_URL`, `INFURA_PROJECT_ID`, `*_ADDRESS`). Same names as web and MCP.
_Avoid_: `NEXT_PUBLIC_` prefixes, a second RPC URL per chain family
