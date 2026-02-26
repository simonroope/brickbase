# Brickbase

Nx monorepo for Property Assets: tokenized commercial real estate RWAs on Ethereum.

## Structure

| Path | Description |
|------|-------------|
| `apps/web` | Next.js web app (display & trade properties) |
| `apps/mcp-server` | MCP server for AI/automation (scaffold) |
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

```

## Environment

Copy `.env.example` to `.env` and set:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` – WalletConnect Cloud project ID
- Contract addresses after deployment

## MCP Server

The MCP server in `apps/mcp-server` is a scaffold. To implement:

1. `npm install @modelcontextprotocol/sdk`
2. Add tools: `get_property_list`, `get_oracle_prices`, etc.
3. Add resources: `contract://AssetVault/abi`, etc.

See `property-assets.md` PRD for full specification.
