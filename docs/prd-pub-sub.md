# PRD: Real-Time Ticker Feeds (Redis Pub/Sub + WebSockets)

**Status:** Draft — implementation specification  
**Audience:** Developers generating this feature in the Brickbase monorepo  
**Related:** `apps/web` (`OraclePrices`, `Header`), `libs/shared-config`, `libs/abi` (unchanged by live feeds)

Use this document as the **single source of truth** to scaffold code. Follow the layout and conventions below exactly unless a later PRD revision says otherwise.

---

## 1. Summary

Add **new real-time data feeds** for **display only** in the Brickbase web app using a **Redis pub/sub → WebSocket gateway → browser** pipeline. Upstream sources:

1. **Coinbase Advanced Trade WebSocket** — live **ETH/USD** spot ticker (UI only)  
2. **Infura WebSocket** — live **block headers** (`newHeads`); optional **logs** in a later phase  

**Display-only scope:** Live feed data is shown in the UI only. **Do not integrate with smart contracts** — no writes, no reads of Brickbase contracts for this feature, no use in purchase/share flows, and no changes to MCP contract tools. Ingest and the live ticker UI must not require `@brickbase/abi`, deployed contract addresses, or viem contract calls.

These feeds are **additive**. They **must not** replace, remove, or change existing **on-chain polling** of `OracleRouter` (ETH/USD, GBP/USD, Gold/USD, FTSE 100 via React Query every 30 seconds in `OraclePrices`). The oracle strip and MCP `get_oracle_prices` remain independent of the live ticker.

---

## 2. Problem and goals

### Problem

- Header oracle data refreshes only every 30 seconds; users have no live market or chain pulse without leaving the app.
- Long-lived connections to Coinbase and Infura must not run inside the Next.js process.
- Future consumers (admin UI, alerts, `apps/integrations/api`) need a bus decoupled from the web server.

### Goals

| Goal | Success metric |
|------|----------------|
| Add live feeds without breaking existing oracle UI | `OraclePrices` polling unchanged; new UI reads WebSocket only |
| Low-latency ETH/USD spot | Median client latency &lt; 500 ms from Coinbase tick (p95 &lt; 2 s) |
| Chain liveness visible | Block indicator updates within one block time of Infura `newHeads` |
| Resilient ingest | Reconnect within 30 s of upstream drop; no crash on malformed frames |
| Horizontally scalable fan-out | Multiple gateway instances share one ingest via Redis |

### Explicit non-goals

- Replacing on-chain `OracleRouter` polling or MCP `get_oracle_prices`.
- Smart contract integration for live feeds.
- Using Coinbase or Infura data for settlement, share pricing, or any business logic.
- Guaranteed delivery or historical storage of every tick (at-most-once is fine for display).

---

## 3. Current state (must remain unchanged)

| Component | Behavior | Requirement |
|-----------|----------|-------------|
| `OraclePrices` | `useQuery` → `fetchOraclePrices` → `OracleRouter`, `refetchInterval: 30_000` | Do not modify |
| MCP | `get_oracle_prices` reads chain | Do not modify for this feature |
| Infra | HTTP RPC via `NEXT_PUBLIC_RPC_URL` | Extend with Redis + integrations processes |

**Two parallel data planes:**

| Plane | Source | UI role |
|-------|--------|---------|
| **On-chain oracle** (existing) | `OracleRouter` / Chainlink | Oracle strip: ETH/USD, GBP/USD, Gold/USD, FTSE 100 |
| **Live feeds** (new) | Coinbase WS + Infura WS | Display-only: spot ETH/USD, block #; logs optional later |

---

## 4. Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│ Coinbase Advanced   │     │ Infura WebSocket    │
│ WS  (ETH-USD)       │     │ (newHeads; logs opt)│
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           ▼                           ▼
┌──────────────────────────────────────────────────┐
│ apps/integrations/ingest/  (Node server process) │
│  coinbaseFeed + infuraFeed → Redis PUBLISH       │
│  SET last-value keys                             │
└──────────────────────────┬───────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │     Redis      │
                  │   PUB / SUB    │
                  └────────┬───────┘
                           │
                           ▼
┌──────────────────────────────────────────────────┐
│ apps/integrations/gateway/  (Node server process)│
│  SUBSCRIBE Redis → WebSocket fan-out             │
│  snapshot last-value keys on client connect        │
└──────────────────────────┬───────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│ LiveTicker + hook   │         │ OraclePrices        │
│ apps/web            │         │ (unchanged)         │
└─────────────────────┘         └─────────────────────┘
```

**Why Redis pub/sub:** Isolates upstream WebSocket sessions from many browser connections; allows multiple gateway replicas without duplicate Coinbase/Infura clients.

**Why not Next.js API routes for upstream WS:** Serverless timeouts and connection limits.

---

## 5. Data sources

### 5.1 Coinbase Advanced Trade WebSocket — ETH/USD

**Reference:** [Coinbase Advanced Trade WebSocket](https://docs.cdp.coinbase.com/advanced-trade/docs/ws-overview)

**v1 subscription**

- URL: `wss://advanced-trade-ws.coinbase.com` (override via `COINBASE_WS_URL`)
- Product: `ETH-USD` (override via `COINBASE_PRODUCT_ID`)
- Channel: `ticker`

**Ingest requirements**

- One upstream connection per ingest process; exponential backoff reconnect (cap ~30 s).
- Parse Advanced Trade ticker channel payloads → `TickerMessage` (§6.2).
- Coalesce Redis publishes (default 250 ms interval) while always retaining the latest price.
- Credentials server-side only; never `NEXT_PUBLIC_*` for Coinbase.

### 5.2 Infura WebSocket — block headers

**Endpoint:** `wss://<network>.infura.io/ws/v3/<INFURA_PROJECT_ID>`

Supported `INFURA_WS_NETWORK` values: `mainnet`, `sepolia`, `base-sepolia`, `base`, `base-mainnet` (map to Infura hostnames in ingest config).

**v1**

| Method | Params | Output |
|--------|--------|--------|
| `eth_subscribe` | `["newHeads"]` | `ChainHeadMessage` |

If `INFURA_PROJECT_ID` is unset, ingest **must still run** the Coinbase feed and log that Infura was skipped.

**Phase 2 (optional)**

| Method | Params | Output |
|--------|--------|--------|
| `eth_subscribe` | `["logs", …]` | `ChainLogMessage` |

ABI decoding via `@brickbase/abi` is optional for log labels only. Do not require `NEXT_PUBLIC_ASSET_*` env vars for MVP ingest.

---

## 6. Redis design

### 6.1 Channels

Prefix: `brickbase:live:`

| Channel | Publisher | Content |
|---------|-----------|---------|
| `brickbase:live:ticker:eth-usd` | Coinbase ingest | `TickerMessage` |
| `brickbase:live:chain:head` | Infura ingest | `ChainHeadMessage` |
| `brickbase:live:chain:log` | Infura ingest (phase 2) | `ChainLogMessage` |

Gateway v1 subscribes to ticker + `chain:head` only. Export channel list as `GATEWAY_SUBSCRIBE_CHANNELS` in `types/channels.ts`.

### 6.2 Message schemas (JSON)

All messages include:

| Field | Type | Description |
|-------|------|-------------|
| `v` | number | `1` |
| `type` | string | `ticker` \| `chain_head` \| `chain_log` |
| `ts` | number | Ingest publish time (Unix ms) |
| `source` | string | `coinbase` \| `infura` |

**`TickerMessage`** — `type: "ticker"`, `source: "coinbase"`

| Field | Type | Notes |
|-------|------|-------|
| `symbol` | string | e.g. `ETH-USD` |
| `price` | string | Decimal string |
| `change24h` | string | Optional |
| `volume24h` | string | Optional |

**`ChainHeadMessage`** — `type: "chain_head"`, `source: "infura"`

| Field | Type | Notes |
|-------|------|-------|
| `chainId` | number | From `CHAIN_ID` env |
| `blockNumber` | string | **Decimal string** (convert from hex in `newHeads`) |
| `blockHash` | string | `0x…` |
| `timestamp` | number | Unix seconds |

**`ChainLogMessage`** (phase 2) — `type: "chain_log"`, `source: "infura"`

| Field | Type |
|-------|------|
| `chainId` | number |
| `blockNumber` | string |
| `transactionHash` | string |
| `address` | string |
| `topics` | string[] |
| `label` | string (optional) |

Invalid payloads: log and drop at ingest; never publish.

### 6.3 Last-value cache

On each publish, ingest must `SET brickbase:live:last:<suffix>` where `<suffix>` is the channel name without the `brickbase:live:` prefix (e.g. `ticker:eth-usd`). Use TTL `LIVE_LAST_VALUE_TTL_SECONDS` (default `86400`). Gateway sends all available last-value keys to each new WebSocket client before streaming live messages.

---

## 7. Implementation: `apps/integrations`

### 7.1 Monorepo conventions (match `apps/web`)

| Rule | Detail |
|------|--------|
| One npm package per app folder | `apps/integrations/package.json` only — **no** `package.json` under `ingest/`, `gateway/`, or `types/` |
| One Nx project per app folder | `apps/integrations/project.json` with `name: "integrations"` — **no** separate `project.json` under `ingest/` or `gateway/` |
| Shared types | Plain `.ts` files in `apps/integrations/types/` — **no** `src/` wrapper, **no** standalone lib under `libs/` |
| Dependencies | All runtime deps (`redis`, `ws`, `zod`, `dotenv`) and dev deps (`tsx`, `typescript`, `@types/node`, `@types/ws`) in `apps/integrations/package.json` only — **not** in repo root `package.json` |
| Import alias | `@brickbase/integrations-types` → `apps/integrations/types/index.ts` via `apps/integrations/tsconfig.json` paths; mirror in `apps/web/tsconfig.json` and `apps/web/next.config.ts` webpack alias (same pattern as `@brickbase/abi`) |

**Folder name `integrations`:** This layer connects to external systems; **data** is what it returns upward to `web` and `mcp`, not the folder name.

### 7.2 Target directory layout

Create exactly this structure:

```
apps/integrations/
  package.json              # name: brickbase-integrations, type: module
  project.json              # Nx project: integrations
  tsconfig.json
  types/
    channels.ts             # LIVE_CHANNELS, GATEWAY_SUBSCRIBE_CHANNELS, lastValueKey()
    messages.ts             # TypeScript interfaces
    schemas.ts              # Zod schemas + parseLiveFeedMessage()
    index.ts                # re-exports
    __tests__/
      schemas.test.ts       # node:test via tsx
  ingest/
    src/
      index.ts              # entry: connect Redis, start feeds, SIGINT shutdown
      config.ts             # dotenv from repo-root ../../.env
      redisPublisher.ts     # publish + last-value SET
      coinbaseFeed.ts       # WS client, parse, coalesce, reconnect
      infuraFeed.ts         # newHeads subscribe, parse, reconnect
      __tests__/
        parsers.test.ts     # node:test for parse helpers
  gateway/
    src/
      index.ts              # HTTP /health, WS upgrade, Redis sub, fan-out
      config.ts
```

Do **not** create: `libs/live-feed-types`, `apps/integrations/ingest/package.json`, `apps/integrations/gateway/project.json`, or `types/package.json`.

### 7.3 `apps/integrations/package.json`

```json
{
  "name": "brickbase-integrations",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "ingest": "tsx ingest/src/index.ts",
    "gateway": "tsx gateway/src/index.ts",
    "test": "tsx --test types/__tests__/schemas.test.ts ingest/src/__tests__/parsers.test.ts"
  },
  "dependencies": {
    "dotenv": "^16.0.0",
    "redis": "^4.7.0",
    "ws": "^8.18.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/ws": "^8.5.13",
    "tsx": "^4.21.0",
    "typescript": "^5"
  }
}
```

### 7.4 `apps/integrations/project.json`

Single Nx project with targets (each runs with `cwd: apps/integrations`):

| Target | Command |
|--------|---------|
| `ingest` | `npm run ingest` |
| `gateway` | `npm run gateway` |
| `test` | `npm run test` |

```json
{
  "name": "integrations",
  "projectType": "application",
  "sourceRoot": "apps/integrations",
  "targets": {
    "ingest": { "executor": "nx:run-commands", "options": { "command": "npm run ingest", "cwd": "apps/integrations" } },
    "gateway": { "executor": "nx:run-commands", "options": { "command": "npm run gateway", "cwd": "apps/integrations" } },
    "test": { "executor": "nx:run-commands", "options": { "command": "npm run test", "cwd": "apps/integrations" } }
  },
  "tags": ["scope:integrations"]
}
```

### 7.5 `apps/integrations/tsconfig.json`

```json
{
  "compilerOptions": {
    "types": ["node"],
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@brickbase/integrations-types": ["./types/index.ts"]
    }
  },
  "include": ["ingest/src/**/*", "gateway/src/**/*", "types/**/*"]
}
```

Ingest and gateway source must import shared types via `@brickbase/integrations-types` (not relative `../../types` in production code is acceptable but prefer the alias for consistency with web).

### 7.6 Ingest process requirements

- Long-running Node process (not Next.js).
- `RedisPublisher`: `createClient`, `publish(channel, json)`, `setEx(lastValueKey(channel), ttl, json)`.
- `coinbaseFeed`: export `parseCoinbaseTicker(raw, productId)` for tests; `startCoinbaseFeed({ wsUrl, productId, publishIntervalMs, publisher })` returns stop function.
- `infuraFeed`: export `parseInfuraNewHead(raw, chainId)` for tests; `startInfuraFeed({ wsUrl, chainId, publisher })` returns stop function.
- `index.ts`: start Coinbase always; start Infura only when `getInfuraWsUrl(projectId, network)` returns a URL.

### 7.7 Gateway process requirements

- HTTP server on `GATEWAY_PORT` (default `8081`).
- `GET /health` → JSON `{ status, clients, redis }`.
- WebSocket upgrade on `GATEWAY_WS_PATH` (default `/ws/live`).
- Validate `Origin` against `GATEWAY_ALLOWED_ORIGINS` (comma-separated, default from `NEXT_PUBLIC_APP_URL`).
- Limit connections per IP (`GATEWAY_MAX_CONNECTIONS_PER_IP`, default `20`).
- On connection: read all `lastValueKey` entries for `GATEWAY_SUBSCRIBE_CHANNELS`, send valid JSON to client, then forward Redis messages to all clients.
- Client `ping` → respond `pong`; server ping/pong heartbeat; idle timeout.
- Do not expose Redis commands to clients.

### 7.8 Environment variables

Add to repo-root `.env.example` (ingest/gateway load `../../.env` when cwd is `apps/integrations`):

```bash
# Live feeds (display only) — server-side unless noted
REDIS_URL=redis://127.0.0.1:6379
INFURA_PROJECT_ID=
INFURA_WS_NETWORK=sepolia
CHAIN_ID=11155111
COINBASE_PRODUCT_ID=ETH-USD
COINBASE_WS_URL=wss://advanced-trade-ws.coinbase.com
TICKER_PUBLISH_INTERVAL_MS=250
LIVE_LAST_VALUE_TTL_SECONDS=86400
GATEWAY_PORT=8081
GATEWAY_WS_PATH=/ws/live
GATEWAY_ALLOWED_ORIGINS=http://localhost:3000
GATEWAY_MAX_CONNECTIONS_PER_IP=20
GATEWAY_MAX_MESSAGE_BYTES=65536
GATEWAY_HEARTBEAT_INTERVAL_MS=30000
GATEWAY_IDLE_TIMEOUT_MS=300000
NEXT_PUBLIC_WS_LIVE_URL=ws://localhost:8081/ws/live
```

### 7.9 Workspace and root scripts

**`pnpm-workspace.yaml`** must include:

```yaml
packages:
  - "apps/*"
  - "libs/*"
```

`apps/integrations` is a direct child of `apps/` with its own `package.json`, so it is covered by `apps/*`. Do **not** add `apps/integrations/*` unless you introduce nested packages under `ingest/` or `gateway/`.

**Root `package.json` scripts** (add):

```json
"integrations:ingest": "nx run integrations:ingest",
"integrations:gateway": "nx run integrations:gateway",
"integrations:test": "nx run integrations:test"
```

### 7.10 Local Redis

Create repo-root `docker-compose.live.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

## 8. Implementation: `apps/web`

### 8.1 UI requirements

Update `apps/web/src/components/Header.tsx`:

- **Row 1 (unchanged):** `OraclePrices` — on-chain ETH/USD, GBP/USD, Gold/USD, FTSE 100 every 30 s.
- **Row 2 (new):** `LiveTicker` below the oracle strip in the same ticker area (`flex-col`, centered).

Do **not** modify `OraclePrices.tsx`, `fetchOraclePrices`, or `refetchInterval`.

### 8.2 Files to create

| File | Responsibility |
|------|----------------|
| `src/hooks/useLiveFeedWebSocket.ts` | Connect to `NEXT_PUBLIC_WS_LIVE_URL` (default `ws://localhost:8081/ws/live`); parse with `parseLiveFeedMessage`; track `ticker` and `chainHead`; reconnect with backoff; derive status `live` \| `delayed` \| `offline` (stale if no message &gt; 10 s while connected) |
| `src/lib/formatLivePrice.ts` | Format decimal string prices for display |
| `src/components/LiveTicker.tsx` | Status dot + labels; `ETH/USD (live):` price; `Block: #N`; tooltip stating display-only / not used for on-chain transactions |

### 8.3 `LiveTicker` display rules

| State | UI |
|-------|-----|
| `live` | Green dot; show latest price and block |
| `delayed` | Amber dot; show last values |
| `offline` | Gray dot; show `--` placeholders |

**Must not** copy Coinbase price into `OraclePrices` or buy-shares / wagmi flows.

### 8.4 Web TypeScript / bundler

In `apps/web/tsconfig.json` paths:

```json
"@brickbase/integrations-types": ["../integrations/types/index.ts"]
```

In `apps/web/next.config.ts` webpack `resolve.alias`:

```ts
"@brickbase/integrations-types": path.resolve(root, "apps/integrations/types/index.ts"),
```

Web keeps its own `zod` dependency for bundling schemas imported from integrations types.

### 8.5 Web tests (minimal)

Create `apps/web/src/lib/__tests__/formatLivePrice.test.ts` (Jest).

---

## 9. Testing requirements

| Layer | Requirement |
|-------|-------------|
| Integrations unit | `nx run integrations:test` — `node:test` + `tsx`; schema parse tests; Coinbase/Infura parser fixture tests with **no** live network |
| Web unit | `formatLivePrice` Jest test |
| Integration (phase 2) | Redis test container: publish → gateway → WS client |
| E2E (phase 2) | Cucumber: oracle row still present; live row updates on mock WS |

CI must not depend on live Coinbase or Infura.

---

## 10. Security

- All upstream and Redis credentials server-side only (`apps/integrations` processes).
- No `INFURA_*` or `COINBASE_*` in the Next.js client bundle.
- Treat the WS stream as public read unless auth is added later.
- Rate-limit gateway connections; no Redis command exposure via WebSocket.

---

## 11. Observability

Log to stderr with prefixes `[ingest][coinbase]`, `[ingest][infura]`, `[ingest][redis]`, `[gateway]`:

- connect / disconnect / reconnect
- publish rate (optional)
- active WS client count on gateway

---

## 12. Rollout phases

### Phase 1 (MVP — build per this PRD)

- `apps/integrations` (types, ingest, gateway) + `docker-compose.live.yml`
- `LiveTicker` + hook in `apps/web`
- `OraclePrices` untouched

### Phase 2

- Infura `logs` → `ChainLogMessage` + optional UI
- Redis integration test; mocked WS web tests

### Phase 3

- Extra Coinbase products; multiple gateway replicas
- `apps/integrations/api` (GraphQL + DB + external REST) — separate scope

---

## 13. Acceptance criteria

- [ ] `OraclePrices` still polls `OracleRouter` every 30 s with same fields and formatting.
- [ ] Live ticker path has no smart contract reads/writes and does not feed buy-shares or MCP tools.
- [ ] With ingest + gateway running, `LiveTicker` updates ETH/USD without full page reload.
- [ ] With `INFURA_PROJECT_ID` set, block indicator updates on new heads.
- [ ] Stopping ingest/gateway leaves oracle row working; live strip shows offline/delayed only.
- [ ] Two gateway instances receive identical Redis messages from one ingest process.
- [ ] Monorepo layout matches §7.2 (single `package.json` / `project.json` under `apps/integrations`).
- [ ] `nx run integrations:test` passes without live upstreams.

---

## 14. Open questions

1. Whether phase 2 log display is needed given display-only scope.
2. Infura network when the user wallet is on a different chain than `CHAIN_ID`.
3. WS gateway authentication in production.
4. Managed Redis (Upstash, ElastiCache) and TLS termination for deployment.

---

## 15. References

- [Coinbase Advanced Trade WebSocket](https://docs.cdp.coinbase.com/advanced-trade/docs/ws-overview)
- [Infura WebSockets](https://docs.infura.io/api/networks/ethereum/how-to/use-websockets)
- [Redis Pub/Sub](https://redis.io/docs/latest/develop/interact/pubsub/)
- Existing: `apps/web/src/components/OraclePrices.tsx` (do not replace)

---

## 16. Local development (after implementation)

```bash
cd apps/integrations && npm install
docker compose -f docker-compose.live.yml up -d   # from repo root
npx nx run integrations:ingest
npx nx run integrations:gateway
npx nx run web:serve
```

Copy `.env.example` → `.env`; set `INFURA_PROJECT_ID` and `NEXT_PUBLIC_WS_LIVE_URL` as needed.
