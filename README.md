# Brickbase

> _Standalone overview of Brickbase — self-contained by design. It restates key facts (structure, commands, skills) so it can be read on its own; that is intentional, not accidental duplication._

Monorepo for fractional RWA investing on Ethereum — **EVM smart contracts**, **MCP** server for AI-powered trading agents, an **events** layer for external data streams, a **Next.js** investor portal for tokenised commercial real estate, and **agentic AI** development workflows powered by Claude Code and Codex.

Development is supported by **agent skills** — structured instruction files for Claude Code and Codex that guide common workflows (requirements elicitation, PRD creation, ticket generation, TDD build, architecture review). See [Agent skills](#agent-skills).

## Structure


| Path                 | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `apps/events`  | Events: live feeds (`ingest`, `gateway`, `types`)          |
| `apps/mcp`           | MCP server for AI/automation (smart contracts, tools, resources) |
| `apps/web`           | Next.js web app (display & trade properties)                     |
| `libs/contracts`     | Solidity smart contracts (Hardhat)                               |
| `libs/abi`           | Shared ABIs (`@brickbase/abi`)                                   |
| `libs/shared-config` | Chain config, env                                                |


## Contracts

Solidity in `libs/contracts/` (Hardhat): **AssetVault**, **AssetShares**, **AssetUserAllowList**, **OracleRouter**, plus mocks. Key Ethereum standards (EIPs):


| EIP / ERC                                           | Name                                        | Usage in Brickbase                                                                                                                                                     |
| --------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [EIP-20](https://eips.ethereum.org/EIPS/eip-20)     | Token Standard                              | **AssetShares** settles purchases in **USDC** (and `MockERC20` in tests) via `approve` / `transferFrom`.                                                               |
| [EIP-721](https://eips.ethereum.org/EIPS/eip-721)   | Non-Fungible Token                          | **AssetVault** mints one NFT per vaulted property; metadata URI and status are on-chain.                                                                               |
| [EIP-1155](https://eips.ethereum.org/EIPS/eip-1155) | Multi Token                                 | **AssetShares** issues fungible share balances per `assetId`; implements **IERC1155Receiver** for safe transfers.                                                      |
| [EIP-165](https://eips.ethereum.org/EIPS/eip-165)   | Standard Interface Detection                | **AssetShares** exposes `IERC165` alongside ERC-1155 / receiver interfaces.                                                                                            |
| [EIP-7943](https://eips.ethereum.org/EIPS/eip-7943) | uRWA — Universal Real World Asset interface | Compliance hooks on **AssetVault** (non-fungible variant) and **AssetShares** (multi-token variant): allowlist checks, freeze, and forced transfer for regulated RWAs. |


**OracleRouter** uses [Chainlink](https://docs.chain.link/data-feeds) `AggregatorV3Interface` price feeds (ETH/USD, GBP/USD, gold, FTSE-style indices); that is a Chainlink abstraction, not an Ethereum token EIP.

Contracts also use OpenZeppelin **AccessControl**, **ReentrancyGuard**, and **Pausable** for roles, reentrancy protection, and emergency pause.

## Setup

### Prerequisites

- Node.js ≥ 18
- Docker (optional; required for local Redis when running events live feeds)

### Install dependencies

Brickbase is an Nx monorepo. **Dependencies are not all hoisted to the repo root** — apps with their own runtime deps declare a `package.json` (`apps/web`, `apps/events`). `apps/mcp` and `libs/abi`, `libs/shared-config`, and `libs/contracts` have no `package.json`; they use the root toolchain and Nx `project.json`.


| Location                 | `package.json` | What gets installed there                                                                                                           |
| ------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Repo root**            | Yes            | Nx, Hardhat, OpenZeppelin/Chainlink for `libs/contracts`, TypeScript, `tsx`, ESLint, Cucumber, Playwright, and other shared tooling |
| `**apps/events`**  | Yes            | `redis`, `ws`, `zod`, `dotenv`, `tsx` (ingest + gateway only)                                                                       |
| `**apps/mcp`**           | No             | MCP SDK, `tsx`, Playwright from **root**; Nx `project.json` only                                                                    |
| `**apps/web`**           | Yes            | Next.js, React, wagmi, viem, Jest, Tailwind, web test stack                                                                         |
| `**libs/contracts`**     | No             | Hardhat toolchain from **root**                                                                                                     |
| `**libs/abi`**           | No             | None — ABIs are files; import via `@brickbase/abi` paths                                                                            |
| `**libs/shared-config`** | No             | Chain config source; Nx project via `project.json` only (like `libs/abi`)                                                           |


**npm (default in this repo)** — run from the repo root:

```bash
npm install
npm install --prefix apps/events
npm install --prefix apps/web
```

Or install from each package folder:

```bash
npm install
cd apps/events && npm install
cd apps/web && npm install
```

**pnpm** — `pnpm-workspace.yaml` includes `apps/`* and `libs/`*, so a single install at the root links all workspace packages (including `apps/events` via `apps/*`):

```bash
pnpm install
```

With pnpm, one root install covers workspace packages with a `package.json` (`apps/*`, and any `libs/*` that define one) — no separate `cd` into each app required.

```bash
rm -rf node_modules apps/web/node_modules apps/events/node_modules
pnpm install
```

### Environment

Copy `.env.example` to `.env` at the **repo root**. Copy or symlink env for the web app as needed (`apps/web/.env.local` can mirror root values). Set contract addresses, `ETHEREUM_RPC_URL`, `WALLETCONNECT_PROJECT_ID`, and events variables (see [Environment](#environment) below). ABIs live in `libs/abi` and are imported as `@brickbase/abi`.

---

## Smart Contracts

```bash
# Local chain (Terminal 1 — keep running; RPC http://127.0.0.1:8545, chain ID 31337)
npx nx run contracts:node
# Or: cd libs/contracts && npx hardhat node

# Compile contracts
npx nx run contracts:compile

# Run contracts tests
npx nx run contracts:test

# Deploy
npx nx run contracts:deploy:localhost

# Seeds
npx nx run contracts:seed-users
npx nx run contracts:seed-assets
```

```bash
# kill Nx daemon
npx nx reset
```

## Events layer

`apps/events` connects Brickbase to **external systems** (market and chain WebSockets today; GraphQL/API/DB later). It returns **data** upward to `apps/web` and `apps/mcp` — the folder name describes the role, not the payload.

**Live feeds (MVP):** display-only ticker in the web header — Coinbase ETH/USD spot + latest block from Infura. This is separate from on-chain oracle polling in `OraclePrices` (Chainlink via `OracleRouter`, still every 30 s). See [docs/pub-sub.md](docs/pub-sub.md) for the full specification.

**Pipeline:**

```
Coinbase WS + Infura WS  →  ingest  →  Redis pub/sub  →  gateway  →  browser (LiveTicker)
```

**Layout** (one `package.json` + one Nx `project.json` per app, same pattern as `web`):

```
apps/events/
  package.json          # brickbase-events — redis, ws, zod, dotenv, tsx
  project.json          # Nx project: events
  types/                # channels, message schemas, Zod (no package.json)
  ingest/src/           # upstream → Redis
  gateway/src/          # Redis → WebSocket clients
```


| Process | Nx command                        | npm script (`apps/events`) |
| ------- | --------------------------------- | -------------------------------- |
| Ingest  | `npx nx run events:ingest`  | `npm run ingest`                 |
| Gateway | `npx nx run events:gateway` | `npm run gateway`                |
| Tests   | `npx nx run events:test`    | `npm run test`                   |


**Run locally** (requires `apps/events` install; use with web for the live ticker UI):

```bash
# Redis (from repo root)
docker compose -f docker-compose.live.yml up -d

# Ingest — Coinbase ticker + Infura newHeads → Redis
npx nx run events:ingest

# Gateway — ws://localhost:8081/ws/live (default)
npx nx run events:gateway
```

Set `INFURA_PROJECT_ID` in `.env` for chain blocks; `WS_LIVE_URL` defaults to `ws://localhost:8081/ws/live`. Coinbase public ticker data does not require API keys.

Root shortcuts: `npm run events:ingest`, `npm run events:gateway`, `npm run events:test`.

## MCP Server

The MCP server exposes smart contract data via tools and resources. Uses stdio (spawn by Cursor or other MCP clients).

**Tools:**

- `purchase_asset_shares` – returns unsigned transaction payloads (approve USDC, purchaseAssetShares) for the agent to sign with its own key. The MCP server holds no private keys.
- `get_asset_list` – list all tokenized assets
- `get_asset_detail` – detail for asset ID
- `get_oracle_prices` – ETH/USD, GBP/USD, Gold/USD, FTSE 100
- `get_user_whitelist_status` – check if address is whitelisted
- `get_user_shares` – user's share balance for an asset
- `get_whitelisted_users` – list all whitelisted addresses

**Resources:**

- `contract://AssetVault/abi`, `contract://AssetShares/abi`, `contract://OracleRouter/abi`, `contract://AssetUserAllowList/abi`
- `config://deployments` – chain and contract addresses

Uses the same `.env` contract addresses as the web app. No private keys; each agent signs with its own wallet.

**Testing:** MCP Inspector (browser UI). Prerequisites – Hardhat node running, contracts deployed, seeds run. Opens [http://localhost:6274](http://localhost:6274) to call tools and read resources.

```bash
npx nx run mcp:serve
```

## Web app

Next.js application to **display and trade** commercial real estate RWAs.

**Features:** Homepage (property list), property detail page (attributes, gallery, buy-shares flow), Admin tab (whitelist, new property placeholder), oracle prices (ETH/USD, GBP/USD, Gold/USD, FTSE 100), live ticker (Coinbase ETH/USD spot + chain block — display only).

**Tech stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, viem, `@brickbase/abi`. Jest (unit), Playwright + Cucumber (E2E/BDD).

**Testing:** Both integration and e2e use Cucumber BDD and require the dev server (started automatically).

- **Integration** (`test:integration`): `tests/features/integration/*.feature`, mock data, no deployed contracts
- **E2E** (`test:e2e`): `tests/features/e2e/*.feature`, real contracts, no e2e scenarios yet

## Environment

### Web & contracts


| Env var                       | Description                                              |
| ----------------------------- | -------------------------------------------------------- |
| `WALLETCONNECT_PROJECT_ID`    | WalletConnect Cloud project ID                           |
| `APP_URL`                     | Application URL (e.g. `https://brickbase.com`)           |
| `CHAIN_ID`                    | Chain ID (e.g. `11155111` for Sepolia)                   |
| `ETHEREUM_RPC_URL`            | Ethereum RPC base URL (e.g. `https://sepolia.infura.io/v3/`) |
| `BASE_RPC_URL`                | Base RPC base URL (e.g. `https://base-sepolia.infura.io/v3/`) |
| `INFURA_PROJECT_ID`           | Infura project ID — appended to RPC URLs at runtime      |
| `ASSET_VAULT_ADDRESS`         | AssetVault contract                                      |
| `ASSET_SHARES_ADDRESS`        | AssetShares contract                                     |
| `ORACLE_ROUTER_ADDRESS`       | OracleRouter contract                                    |
| `USER_ALLOWLIST_ADDRESS`      | AllowList contract                                       |
| `USDC_ADDRESS`                | USDC token address                                       |


### Events (live feeds, server-side unless noted)


| Env var                   | Description                                                               |
| ------------------------- | ------------------------------------------------------------------------- |
| `REDIS_URL`               | Redis for pub/sub (e.g. `redis://127.0.0.1:6379`)                         |
| `INFURA_PROJECT_ID`       | Infura project ID for `newHeads` (optional; ingest skips Infura if unset) |
| `CHAIN_ID`                | Chain ID in outbound messages                                             |
| `COINBASE_PRODUCT_ID`     | Default `ETH-USD`                                                         |
| `GATEWAY_PORT`            | Default `8081`                                                            |
| `GATEWAY_WS_PATH`         | Default `/ws/live`                                                        |
| `WS_LIVE_URL`             | Browser WebSocket URL (e.g. `ws://localhost:8081/ws/live`)                |


Full list in `.env.example`.

```bash
npx nx run web:serve            # Dev server
npx nx run web:build            # Production build
npx nx run web:test             # Jest unit tests
npx nx run web:test:integration # Cucumber BDD integration tests (mock data, starts dev server)
npx nx run web:test:e2e         # Cucumber BDD e2e tests (real contracts, starts dev server)
```

## Agent skills

Skills live in `.claude/skills/` and are available to Claude Code, Codex and Cursor. Each skill is a self-contained instruction file invoked by name.

| Skill                           | Claude Code                       | Codex                             | Description |
|---------------------------------|-----------------------------------|-----------------------------------|-------------|
| `build-code`                    | `/build-code`                     | `$build-code`                     | Implement a spec or set of tickets using TDD, run type-checking and tests, then self-review with `code-review` |
| `code-review`                   | `/code-review`                    | `$code-review`                    | Review changes since a fixed point against coding standards and the originating issue/PRD |
| `create-prd`                    | `/create-prd`                     | `$create-prd`                     | Synthesise conversation into a PRD |
| `create-tickets`                | `/create-tickets`                 | `$create-tickets`                 | Break a plan into GitHub issues with BDD acceptance criteria |
| `model-domain`                  | `/model-domain`                   | `$model-domain`                   | Build and maintain `CONTEXT.md` and ADRs |
| `elicit`                        | `/elicit`                         | `$elicit`                         | Interview to sharpen a design or plan |
| `elicit-requirements`           | `/elicit-requirements`            | `$elicit-requirements`            | Requirements elicitation using the domain model |
| `tdd`                           | `/tdd`                            | `$tdd`                            | TDD loop — red → green → refactor |
| `triage`                        | `/triage`                         | `$triage`                         | Move issues through the triage state machine — categorise, verify, and write agent-ready briefs |

Add new skills to `.claude/skills/<name>/SKILL.md`, then run:

```bash
npm run skills:sync
```

This registers the skill in `.codex/skills/` and `~/.codex/skills/` so both agents can invoke it.

## ToDo

- Account Abstraction
- Upgradeable proxy contracts

