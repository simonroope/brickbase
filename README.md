# Brickbase

Nx monorepo for Property Assets: tokenized commercial real estate RWAs on Ethereum.

## Structure

| Path | Description |
|------|-------------|
| `apps/web` | Next.js web app (display & trade properties) |
| `apps/mcp-server` | MCP server for AI/automation (smart contracts, tools, resources) |
| `libs/contracts` | Solidity smart contracts (Hardhat) |
| `libs/abi` | Shared ABIs (`@brickbase/abi`) |
| `libs/shared-config` | Chain config, env |

## Setup

```bash
npm install
```

## Commands

```bash
# Compile contracts
npx nx run contracts:compile

# Run Node or npx nx contracts:node
npx nx run contracts:node

# Run contracts tests
npx nx run contracts:test

# Deploy
npx nx run contracts:deploy:localhost

# Seeds
npx nx run contracts:seed-users
npx nx run contracts:seed-assets

# Build web app
npx nx run web:build

# Serve web app or npx nx serve web
npx nx run web:serve

# MCP server (stdio – use with Cursor or other MCP clients)
npx nx run mcp-server:serve

```

## Environment

Copy `.env.example` to `.env` and set:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` – WalletConnect Cloud project ID
- Contract addresses after deployment

## MCP Server

The MCP server exposes smart contract data via tools and resources. Uses stdio (spawn by Cursor or other MCP clients).

**Tools:**
- `get_property_list` – list all tokenized properties
- `get_property_detail` – detail for asset ID
- `get_oracle_prices` – ETH/USD, GBP/USD, Gold/USD, FTSE 100
- `get_user_whitelist_status` – check if address is whitelisted
- `get_user_shares` – user's share balance for an asset
- `get_whitelisted_users` – list all whitelisted addresses

**Resources:**
- `contract://AssetVault/abi`, `contract://AssetShares/abi`, `contract://OracleRouter/abi`, `contract://AssetUserAllowList/abi`
- `config://deployments` – chain and contract addresses

Uses the same `.env` contract addresses as the web app.

**Testing:**

1. **MCP Inspector** (browser UI): Prerequisites – Hardhat node running, contracts deployed, seeds run. From brickbase:
   ```bash
   npx @modelcontextprotocol/inspector npx tsx apps/mcp-server/src/index.ts
   ```
   Opens http://localhost:6274 to call tools and read resources.

2. **Test script** (programmatic):
   ```bash
   npx nx run mcp-server:test:mcp
   ```
   Spawns the server, calls `get_oracle_prices`, `get_property_list`, reads `config://deployments`.
