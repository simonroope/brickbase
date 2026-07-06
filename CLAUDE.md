# Brickbase — Claude Code Guide

Nx monorepo for fractional RWA investing on Ethereum: EVM smart contracts, MCP server, events layer (live feeds), and a Next.js investor portal.

## Agent skills

Skills live in `.agents/skills/`. Invocation differs by agent:

| Agent | Skills dir | Prefix | Example |
|---|---|---|---|
| Claude Code | `.claude/skills/<name>/SKILL.md` | `/` | `/handoff` |
| Codex | `.codex/skills/<name>/SKILL.md` | `$` | `$handoff` |

Available skills:

```
.agents/skills/
  domain-modeling/SKILL.md
  grill-me/SKILL.md
  grill-with-docs/SKILL.md
  grilling/SKILL.md
  handoff/SKILL.md
  improve-codebase-architecture/SKILL.md
  tdd/SKILL.md
  to-issues/SKILL.md
  to-prd/SKILL.md
```

Run `npm run skills:sync` after adding new skills to register them in `.claude/commands/` and `.codex/skills/`.

## Monorepo layout

```
apps/web/          Next.js investor portal (App Router, Tailwind, wagmi, viem)
apps/mcp/          MCP server — AI agent tools + resources for smart contracts
apps/events/
  ingest/src/      Coinbase WS + Infura newHeads → Redis pub/sub
  gateway/src/     Redis → browser WebSocket clients
  types/           Shared Zod schemas (no package.json)
libs/contracts/    Solidity (Hardhat): AssetVault, AssetShares, OracleRouter, AssetUserAllowList
libs/abi/          Compiled ABIs — import as @brickbase/abi
libs/shared-config/ Chain config, RPC helpers — import as @brickbase/shared-config
infra/
  docker/          One Dockerfile per service (Dockerfile.web/mcp/ingest/gateway)
  production/      Terraform (ECS Fargate, ECR, VPC, ALB, ElastiCache, SSM), deploy.sh, task def templates
.github/workflows/ CI/CD: publish-to-ecr.yml, deploy-to-environment.yml, production-build-deploy.yml
```

## Package.json locations

Only some apps have their own `package.json`. Run installs accordingly:

| Location | Has package.json | Notes |
|---|---|---|
| Repo root | Yes | Nx, Hardhat, OpenZeppelin, TypeScript, tsx, ESLint, Playwright |
| `apps/web` | Yes | Next.js, React, wagmi, viem, Jest, Tailwind |
| `apps/events` | Yes | redis, ws, zod, dotenv, tsx |
| `apps/mcp` | No | Uses root toolchain |
| `libs/contracts` | No | Uses root Hardhat toolchain |
| `libs/abi` | No | Files only — no install needed |
| `libs/shared-config` | No | Files only |

Install:
```bash
npm install
npm install --prefix apps/web
npm install --prefix apps/events
```

## Essential commands

```bash
# Smart contracts
npx nx run contracts:node          # Local Hardhat node (keep running — http://127.0.0.1:8545, chain 31337)
npx nx run contracts:compile       # Compile + generate ABIs
npx nx run contracts:test          # Hardhat tests
npx nx run contracts:deploy:localhost

# Web app
npx nx run web:serve               # Dev server (http://localhost:3000)
npx nx run web:build               # Production build
npx nx run web:test                # Jest unit tests
npx nx run web:test:integration    # Cucumber BDD (mock data, no contracts)
npx nx run web:test:e2e            # Cucumber BDD (real contracts)

# MCP server
npx nx run mcp:serve               # stdio MCP server for Cursor/agents

# Events
npx nx run events:ingest           # Coinbase + Infura → Redis
npx nx run events:gateway          # Redis → WebSocket clients (ws://localhost:8081/ws/live)

# Skills
npm run skills:sync                # Sync .agents/skills/ → .claude/commands/ symlinks

# Utilities
npx nx reset                       # Kill Nx daemon
docker compose -f docker-compose.live.yml up -d  # Local Redis
```

## Environment variables

Copy `.env.example` → `.env` at repo root. **Never use `NEXT_PUBLIC_` prefixes** — the web app exposes values to the browser via `next.config.ts`'s `env` block using canonical names.

### Canonical names (used everywhere — code, Dockerfiles, GitHub vars, ECS task defs)

```
CHAIN_ID                    Chain ID (31337=localhost, 11155111=sepolia, 1=mainnet)
ETHEREUM_RPC_URL            Base Ethereum RPC URL ending with / (e.g. https://sepolia.infura.io/v3/)
BASE_RPC_URL                Base chain RPC URL
INFURA_PROJECT_ID           Appended to RPC base URLs at runtime — stored as AWS SSM secret in prod
APP_URL                     Application URL (e.g. https://brickbase.com)
WALLETCONNECT_PROJECT_ID    WalletConnect Cloud project ID
WS_LIVE_URL                 Browser WebSocket URL (e.g. ws://localhost:8081/ws/live)

# Deployed contract addresses — populated from libs/contracts/deploy/{network}-addresses.json
ASSET_VAULT_ADDRESS
ASSET_SHARES_ADDRESS
ORACLE_ROUTER_ADDRESS
USER_ALLOWLIST_ADDRESS
USDC_ADDRESS

# Contract deployment inputs
ADMIN_ADDRESS
ADMIN_ASSET_MANAGER_ADDRESS
ADMIN_COMPLIANCE_ADDRESS
CHAINLINK_ETH_USD_ADDRESS
CHAINLINK_USD_GBP_ADDRESS
CHAINLINK_XAU_USD_ADDRESS
CHAINLINK_FTSE100_ADDRESS
```

### RPC URL pattern

`ETHEREUM_RPC_URL` is always the base URL ending with `/`. `INFURA_PROJECT_ID` is appended at runtime:
- `libs/shared-config` uses `appendProjectId(baseUrl)`
- `apps/web/next.config.ts` uses `buildRpcUrl(base)` during build
- `apps/mcp/src/contracts.ts` appends at startup
- `apps/events/ingest/src/config.ts` derives the WS URL from `ETHEREUM_RPC_URL` hostname

## Smart contract deployment

Deploy script: `libs/contracts/scripts/deploy.ts`

- Run from `libs/contracts/` directory: `npx hardhat run scripts/deploy.ts --network <network>`
- Config loaded from `libs/contracts/deploy/{network}.json`, overridden by env vars
- `USDC_ADDRESS` is optional — deploys MockERC20 if not provided
- Chainlink feeds: deploy mock aggregators on localhost if addresses absent
- Output written to `libs/contracts/deploy/{network}-addresses.json` with canonical keys

```json
{
  "ASSET_VAULT_ADDRESS": "0x...",
  "ASSET_SHARES_ADDRESS": "0x...",
  "ORACLE_ROUTER_ADDRESS": "0x...",
  "USER_ALLOWLIST_ADDRESS": "0x...",
  "USDC_ADDRESS": "0x..."
}
```

After deployment, copy these values into `.env` and the relevant GitHub Environment variables.

## Import conventions

```typescript
import { AssetVaultABI } from "@brickbase/abi";
import { appendProjectId, getChainConfig } from "@brickbase/shared-config";
import type { TickerMessage } from "@brickbase/events-types";
```

Never import ABI files by relative path from `apps/` — always use `@brickbase/abi`.

## Infrastructure

Production runs on **AWS ECS Fargate** (not Kubernetes — do not suggest kubectl).

- ECR repositories: `brickbase-web`, `brickbase-mcp`, `brickbase-ingest`, `brickbase-gateway`
- ECS cluster: `brickbase-uk-production` (eu-west-2)
- Task definitions rendered by `infra/production/deploy.sh` from `taskdefs/*.json.tmpl`
- `INFURA_PROJECT_ID` injected via AWS SSM Parameter Store (not a plaintext env var in ECS)
- Terraform state in `infra/production/`; apply from that directory

CloudWatch log groups:
```
/ecs/brickbase-uk-production/brickbase-web
/ecs/brickbase-uk-production/brickbase-mcp
/ecs/brickbase-uk-production/brickbase-ingest
/ecs/brickbase-uk-production/brickbase-gateway
```

## CI/CD workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `publish-to-ecr.yml` | Push to `main` | Build + push all 4 Docker images to ECR |
| `deploy-to-environment.yml` | `workflow_dispatch` | Deploy existing ECR images to a GitHub Environment; optionally deploy contracts first |
| `production-build-deploy.yml` | Release published | Full build, publish, and deploy to production |

GitHub Environments (`production`, `staging`) store `vars.*` (non-secret config) and `secrets.*`. Contract addresses are stored as environment vars and auto-updated by `deploy-to-environment.yml` after contract deployment.

## Key rules

- **No `NEXT_PUBLIC_` prefixes** anywhere — not in code, Dockerfiles, GitHub vars, or task defs.
- **No per-lib `package.json`** unless the lib is published externally.
- **No private keys in the MCP server** — it returns unsigned transaction payloads; agents sign with their own wallets.
- **Contract addresses come from `{network}-addresses.json`** after deployment — do not hardcode them.
- **`tsx` is the runtime for MCP, ingest, and gateway** — these apps run TypeScript directly, no compile step.
- **`next.config.ts` `env` block** is the single place where env vars are baked into the Next.js browser bundle.
- **Dynamic API routes** in Next.js must export `export const dynamic = "force-dynamic"` to prevent static pre-rendering.
- **Nx targets** are the canonical way to run everything — prefer `npx nx run <project>:<target>` over direct commands.
