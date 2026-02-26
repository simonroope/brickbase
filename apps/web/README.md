# Property Assets App

Web application to **display and trade** commercial real estate Real World Assets (RWAs) tokenized on the Ethereum blockchain.

## Features

- **Homepage**: List of tokenized properties with image and headline (capital value, share price, available shares)
- **Property detail page**: Full attributes, gallery, and buy-shares flow (approve USDC, `purchaseShares`)
- **Admin tab**: Whitelist management (`setUserAllowed`), placeholder for new property mint flow
- **Oracle prices**: ETH/USD, USD/GBP, USD/Gold, FTSE 100 (via OracleRouter)

## Tech Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- viem for blockchain reads/writes
- ABIs copied from `property-assets-contracts/abi/`
- Jest (unit), Playwright + Cucumber (E2E/BDD)

## Setup

1. Copy `.env.example` to `.env.local` and set contract addresses and RPC URL.
2. Deploy or use existing `property-assets-contracts` deployment.
3. Copy ABIs from `../property-assets-contracts/abi/` to `contracts/abi/` (or run a sync script).

```bash
npm install
npm run dev
```

## Scripts

| Script       | Description                    |
|-------------|--------------------------------|
| `npm run dev` | Start dev server             |
| `npm run build` | Production build           |
| `npm run start` | Start production server     |
| `npm run lint` | ESLint                      |
| `npm run test` | Jest unit tests             |
| `npm run test:e2e` | Playwright E2E tests    |
| `npm run test:bdd` | Cucumber BDD tests      |

## Configuration

| Env var                          | Description                |
|----------------------------------|----------------------------|
| `NEXT_PUBLIC_RPC_URL`            | Ethereum RPC URL           |
| `NEXT_PUBLIC_CHAIN_ID`           | Chain ID (e.g. 11155111)    |
| `NEXT_PUBLIC_ASSET_VAULT_ADDRESS` | AssetVault contract        |
| `NEXT_PUBLIC_ASSET_SHARES_ADDRESS` | AssetShares contract     |
| `NEXT_PUBLIC_ORACLE_ROUTER_ADDRESS` | OracleRouter contract  |
| `NEXT_PUBLIC_USER_ALLOWLIST_ADDRESS` | AllowList contract     |
| `NEXT_PUBLIC_USDC_ADDRESS`       | USDC token address         |

## Directory Structure

```
property-assets-app/
├── .cursor/rules/       # Cursor standards
├── .github/workflows/   # CI, E2E
├── contracts/abi/       # ABIs from property-assets-contracts
├── src/
│   ├── app/             # Next.js App Router
│   ├── components/
│   ├── context/
│   └── lib/
└── tests/
    ├── features/       # BDD features (integration, e2e)
    ├── mocks/
    ├── steps/
    └── support/
```

## License

MIT
