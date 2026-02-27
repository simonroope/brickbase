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
| `libs/test-seed` | Shared users/assets seeding for MCP and web e2e tests |

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` (and to `apps/web/.env.local` for the web app) and set contract addresses, RPC URL, and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. ABIs are in `libs/abi` (`@brickbase/abi`).

## Commands

```bash
# Compile contracts
npx nx run contracts:compile

# Run Node
npx nx run contracts:node

# Run contracts tests
npx nx run contracts:test

# Deploy
npx nx run contracts:deploy:localhost

# Seeds
npx nx run contracts:seed-users
npx nx run contracts:seed-assets

# Web app
npx nx run web:serve            # Dev server
npx nx run web:build            # Production build
npx nx run web:test             # Jest unit tests
npx nx run web:test:integration # Cucumber BDD integration tests (mock data, starts dev server)
npx nx run web:test:e2e         # Cucumber BDD e2e tests (real contracts, starts dev server)

# MCP server (stdio – use with Cursor or other MCP clients)
npx nx run mcp-server:serve

```

## Web app

Next.js application to **display and trade** commercial real estate RWAs.

**Features:** Homepage (property list), property detail page (attributes, gallery, buy-shares flow), Admin tab (whitelist, new property placeholder), oracle prices (ETH/USD, GBP/USD, Gold/USD, FTSE 100).

**Tech stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, viem, `@brickbase/abi`. Jest (unit), Playwright + Cucumber (E2E/BDD).

**Testing:** Both integration and e2e use Cucumber BDD and require the dev server (started automatically).

- **Integration** (`test:integration`): `tests/features/integration/*.feature`, mock data, no deployed contracts
- **E2E** (`test:e2e`): `tests/features/e2e/*.feature`, real contracts, no e2e scenarios yet

## Environment

| Env var | Description |
|---------|-------------|
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect Cloud project ID |
| `NEXT_PUBLIC_RPC_URL` | Ethereum RPC URL |
| `NEXT_PUBLIC_CHAIN_ID` | Chain ID (e.g. 11155111) |
| `NEXT_PUBLIC_ASSET_VAULT_ADDRESS` | AssetVault contract |
| `NEXT_PUBLIC_ASSET_SHARES_ADDRESS` | AssetShares contract |
| `NEXT_PUBLIC_ORACLE_ROUTER_ADDRESS` | OracleRouter contract |
| `NEXT_PUBLIC_USER_ALLOWLIST_ADDRESS` | AllowList contract |
| `NEXT_PUBLIC_USDC_ADDRESS` | USDC token address |

## MCP Server

The MCP server exposes smart contract data via tools and resources. Uses stdio (spawn by Cursor or other MCP clients).

**Tools:**
- `purchase_shares` – returns unsigned transaction payloads (approve USDC, purchaseShares) for the agent to sign with its own key. The MCP server holds no private keys.
- `get_property_list` – list all tokenized properties
- `get_property_detail` – detail for asset ID
- `get_oracle_prices` – ETH/USD, GBP/USD, Gold/USD, FTSE 100
- `get_user_whitelist_status` – check if address is whitelisted
- `get_user_shares` – user's share balance for an asset
- `get_whitelisted_users` – list all whitelisted addresses

**Resources:**
- `contract://AssetVault/abi`, `contract://AssetShares/abi`, `contract://OracleRouter/abi`, `contract://AssetUserAllowList/abi`
- `config://deployments` – chain and contract addresses

Uses the same `.env` contract addresses as the web app. No private keys; each agent signs with its own wallet.

**Testing:**

1. **MCP Inspector** (browser UI): Prerequisites – Hardhat node running, contracts deployed, seeds run. From brickbase:
   ```bash
   npx @modelcontextprotocol/inspector npx tsx apps/mcp-server/src/index.ts
   ```
   Opens http://localhost:6274 to call tools and read resources.

2. **Playwright tests**:
   ```bash
   npx nx run mcp-server:test:mcp
   ```
   Runs Playwright tests in `apps/mcp-server/tests/mcp.spec.ts`: tools listing, `get_oracle_prices`, `get_property_list`, `config://deployments`, and agent purchase flow. Seeds users and assets via `@brickbase/test-seed` (independent of contracts scripts). Uses Hardhat account #2. Prereqs: Hardhat node, deploy.
