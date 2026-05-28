# PRD: Real-Time Ticker Feeds (Redis Pub/Sub + WebSockets)

**Status:** Draft  
**Audience:** Developers implementing new infrastructure and UI in the Brickbase monorepo  
**Related:** `apps/web` (`OraclePrices`, `Header`), `libs/shared-config`

---

## 1. Summary

Add **new real-time data feeds** for **display only** in the Brickbase web app using a **Redis pub/sub → WebSocket gateway → browser** pipeline. Upstream sources:

1. **Coinbase Advanced Trade WebSocket** — live **ETH/USD** spot ticker (UI only)  
2. **Infura WebSocket** — live **block headers** and, optionally, **log** subscriptions for chain-activity display  

**Display-only scope:** New ticker prices and related live feed data are shown in the UI only. There is **no requirement to integrate with smart contracts** — no writes, no reads of Brickbase contracts for this feature, no use in purchase/share flows, and no changes to MCP contract tools. Ingest and the web client do not need `@brickbase/abi`, deployed contract addresses, or viem contract calls for the live ticker path.

These feeds are **additive**. They do **not** replace, remove, or change existing **on-chain polling** of `OracleRouter` (ETH/USD, GBP/USD, Gold/USD, FTSE 100 via React Query every 30 seconds in `OraclePrices`). The oracle strip and MCP `get_oracle_prices` continue to serve contract-adjacent and Chainlink-backed context independently of the live ticker.

---

## 2. Problem and goals

### Problem

- Header oracle data refreshes only every 30 seconds; users have no live market or chain pulse without leaving the app.
- Long-lived connections to Coinbase and Infura should not run inside the Next.js process.
- Future consumers (admin UI, alerts) need a bus decoupled from the web server.

### Goals

| Goal | Success metric |
|------|----------------|
| Add live feeds without breaking existing oracle UI | `OraclePrices` polling unchanged; new UI reads WS only |
| Low-latency ETH/USD spot | Median client latency &lt; 500 ms from Coinbase tick (p95 &lt; 2 s) |
| Chain liveness visible | New block header updates within one block time of Infura notification |
| Resilient ingest | Reconnect within 30 s of upstream drop; no crash on malformed frames |
| Horizontally scalable fan-out | Multiple WS gateway instances share one ingest via Redis |

### Explicit non-goals

- **Replacing** on-chain `OracleRouter` polling or MCP `get_oracle_prices`.
- **Smart contract integration** for live feeds (no triggering txs, no syncing prices on-chain, no AssetShares/AssetVault/OracleRouter coupling in ingest or UI).
- Using Coinbase or Infura data for settlement, pricing shares, or any business logic.
- Guaranteed delivery or historical storage of every tick (at-most-once is fine for display).

---

## 3. Current state (unchanged by this feature)

| Component | Behavior | Must remain |
|-----------|----------|-------------|
| `OraclePrices` | `useQuery` → `fetchOraclePrices` → `OracleRouter`, `refetchInterval: 30_000` | Yes — no removal or interval change |
| MCP | `get_oracle_prices` reads chain | Yes |
| Infra | HTTP RPC via `NEXT_PUBLIC_RPC_URL`; no Redis/WS services | Extended, not replaced |

**Principle:** Two parallel data planes:

| Plane | Source | UI role |
|-------|--------|---------|
| **On-chain oracle** (existing) | `OracleRouter` / Chainlink | Authoritative oracle strip: ETH/USD, GBP/USD, Gold/USD, FTSE 100 |
| **Live feeds** (new) | Coinbase WS + Infura WS | Display-only: spot ETH/USD, block height/pulse; optional log lines for UI (not wired to contracts) |

---

## 4. Proposed architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│ Coinbase Advanced   │     │ Infura WebSocket    │
│ WS  (ETH-USD)       │     │ (newHeads; logs opt)│
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           ▼                           ▼
┌──────────────────────────────────────────────────┐
│ apps/integrations/ingest                         │
│  - normalize → PUBLISH Redis channels            │
│  - optional SET last-value keys                  │
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
│ apps/integrations/gateway                        │
│  - SUBSCRIBE Redis → fan-out to browsers         │
└──────────────────────────┬───────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│ New live ticker UI  │         │ OraclePrices        │
│ (WS client hook)    │         │ (on-chain poll,     │
│                     │         │  unchanged)         │
└─────────────────────┘         └─────────────────────┘
```

**Why Redis pub/sub:** Isolates fragile upstream WS sessions from many browser connections; allows scaling gateway replicas without duplicate Coinbase/Infura clients.

---

## 5. Data sources (new feeds only)

### 5.1 Coinbase Advanced Trade WebSocket — ETH/USD

**Purpose:** Live **spot** ETH/USD for the new ticker — **display only**. Not consumed by smart contracts, MCP tools, or share-purchase flows.

**Reference:** [Coinbase Advanced Trade WebSocket](https://docs.cdp.coinbase.com/advanced-trade/docs/ws-overview) — confirm channel and product IDs at implementation time.

**v1 subscription**

- Product: `ETH-USD`
- Channel: `ticker` (last price; optional 24h change/volume for display)

**Ingest behavior**

- One upstream connection per ingest process; reconnect with exponential backoff (cap ~30 s).
- Map frames → canonical `TickerMessage` (§6.2).
- Coalesce publishes to ~4–10/sec max (configurable) while always keeping latest price.
- Server-side env only for any required credentials (`COINBASE_*`); never `NEXT_PUBLIC_*`.

### 5.2 Infura WebSocket — blocks (and optional log display)

**Purpose:** Live **chain head** for a “chain pulse” in the UI. Optional `logs` subscription in a later phase may surface raw or lightly labeled activity — still **display only**, with **no** Brickbase contract integration requirement.

**Endpoint:** `wss://<network>.infura.io/ws/v3/<INFURA_PROJECT_ID>` where `<network>` aligns with `CHAIN_ID` used for display (e.g. same network as the app’s default RPC).

**v1 subscription (required)**

| Method | Filter | Output message |
|--------|--------|----------------|
| `eth_subscribe` → `newHeads` | — | `ChainHeadMessage` |

**Phase 2 (optional)**

| Method | Filter | Output message |
|--------|--------|----------------|
| `eth_subscribe` → `logs` | Broad or app-chosen filters | `ChainLogMessage` — block/tx/address/topics for UI only |

If log display is added, decoding with `@brickbase/abi` is **optional** (nicer labels in UI), not required. Do not depend on `NEXT_PUBLIC_ASSET_*` contract env vars for MVP ingest.

**Ingest behavior**

- Re-subscribe after reconnect.
- Publish only fields needed for display (block number, hash, timestamp; for logs, minimal JSON).
- `INFURA_PROJECT_ID` server-side only.
- No contract calls, no event handlers that affect app state beyond the live ticker component.

---

## 6. Redis design

### 6.1 Channels (new feed namespace)

Prefix: `brickbase:live:` (distinct from any future oracle cache keys)

| Channel | Publisher | Content |
|---------|-----------|---------|
| `brickbase:live:ticker:eth-usd` | Coinbase ingest | `TickerMessage` |
| `brickbase:live:chain:head` | Infura ingest | `ChainHeadMessage` |
| `brickbase:live:chain:log` | Infura ingest (phase 2, optional) | `ChainLogMessage` |

Use granular channels. Gateway subscribes to ticker + `chain:head` for v1; add `chain:log` when optional log display ships.

### 6.2 Message schemas (JSON)

Every message includes:

| Field | Type | Description |
|-------|------|-------------|
| `v` | number | Schema version (`1`) |
| `type` | string | `ticker` \| `chain_head` \| `chain_log` (optional) |
| `ts` | number | Ingest publish time (Unix ms) |
| `source` | string | `coinbase` \| `infura` |

**`TickerMessage`** (`type: "ticker"`)

| Field | Type | Notes |
|-------|------|-------|
| `symbol` | string | e.g. `ETH-USD` |
| `price` | string | Decimal string (avoid float in Redis) |
| `change24h` | string | Optional |
| `volume24h` | string | Optional |

**`ChainHeadMessage`** (`type: "chain_head"`)

| Field | Type | Notes |
|-------|------|-------|
| `chainId` | number | e.g. `11155111` |
| `blockNumber` | string | Single convention: decimal or `0x` hex — document in README |
| `blockHash` | string | |
| `timestamp` | number | Unix seconds |

**`ChainLogMessage`** (`type: "chain_log"`, phase 2, optional)

| Field | Type | Notes |
|-------|------|-------|
| `chainId` | number | |
| `blockNumber` | string | |
| `transactionHash` | string | |
| `address` | string | Log contract address |
| `topics` | string[] | Raw topics for display or optional decode |
| `label` | string | Optional human-readable line for UI |

Invalid payloads: log and drop at ingest; never publish.

### 6.3 Last-value cache (recommended)

On each publish, `SET brickbase:live:last:<channel-suffix>` with same JSON and TTL (e.g. 24 h). Gateway sends snapshot to new WS clients before live stream so the ticker is not empty on connect.

---

## 7. WebSocket gateway

### 7.1 Role

New Nx app at `apps/integrations/gateway`:

1. Subscribe to Redis channels in §6.1 (and read last-value keys).
2. Accept browser connections at e.g. `/ws/live`.
3. Forward JSON text frames to all connected clients.

Do **not** terminate Coinbase/Infura inside Next.js API routes (serverless timeouts, connection limits).

### 7.2 Client protocol (v1)

**Connect:** `NEXT_PUBLIC_WS_LIVE_URL` → e.g. `wss://<host>/ws/live`

**Server → client:** Envelope optional; minimum is canonical Redis JSON:

```json
{
  "v": 1,
  "type": "ticker",
  "ts": 1716892800123,
  "source": "coinbase",
  "symbol": "ETH-USD",
  "price": "3456.78"
}
```

**On connect:** Burst of last-value messages, then stream.

**Client → server (minimal):** `ping` / `pong` only for v1.

### 7.3 Operations

- Validate `Origin` against `NEXT_PUBLIC_APP_URL` in production.
- Connection limits per IP; max frame size (e.g. 64 KB).
- Server heartbeat; idle disconnect after configurable timeout.
- `GET /health` — Redis up; optional subscriber lag metric.

---

## 8. Ingest service

### 8.1 Packaging

New Nx app at `apps/integrations/ingest` with modules:

- `coinbaseFeed` — ETH-USD ticker → Redis  
- `infuraFeed` — `newHeads` → Redis (`logs` optional in phase 2)  

Single process with two async loops is acceptable for v1. No shared library dependency on `@brickbase/abi` for MVP.

### 8.2 Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | Yes | e.g. `redis://localhost:6379` |
| `INFURA_PROJECT_ID` | Yes | |
| `INFURA_WS_NETWORK` | Yes | e.g. `sepolia`, `base-sepolia` |
| `CHAIN_ID` | Yes | Embedded in outbound messages (display context only) |
| `COINBASE_PRODUCT_ID` | No | Default `ETH-USD` |
| `TICKER_PUBLISH_INTERVAL_MS` | No | Coalesce window (default 250) |

Contract deployment addresses are **not** required for this feature in v1.

Extend `.env.example` when implementing; no secrets in repo.

### 8.3 Failure behavior

| Failure | Behavior |
|---------|----------|
| Coinbase down | Reconnect; live ticker shows stale + “delayed”; **oracle strip unaffected** |
| Infura down | Reconnect; block/event indicators stall; **oracle strip unaffected** |
| Redis down | Ingest drops ticks, retries; gateway health fails |
| WS gateway down | Live ticker offline; **oracle strip still polls on-chain** |

---

## 9. Frontend (`apps/web`)

### 9.1 UI layout (additive)

Keep existing header row:

- **`OraclePrices`** — unchanged: on-chain ETH/USD, GBP/USD, Gold/USD, FTSE 100 every 30 s.

Add a **separate** live strip (or clearly labeled subsection), e.g. `LiveTicker`:

| Field | Source | Label suggestion |
|-------|--------|------------------|
| ETH/USD spot | Coinbase `TickerMessage` | “ETH/USD (live)” or icon + price |
| Block | `ChainHeadMessage` | Block # / pulse dot |
| Chain logs | `ChainLogMessage` (phase 2) | Optional; display-only, not tied to purchase or admin flows |

Users must be able to distinguish **Chainlink oracle (on-chain poll)** vs **Coinbase spot (live, display only)** via label or tooltip.

### 9.2 New pieces (do not modify oracle fetch path)

| Piece | Responsibility |
|-------|----------------|
| `useLiveFeedWebSocket` | Connect, parse, reconnect, merge snapshot |
| `LiveTicker` | Render live feed state only |
| `Header` | Compose `OraclePrices` + `LiveTicker` |

**States for live strip:** `live` | `delayed` | `offline` (WS down or no message &gt; 10 s). Offline shows placeholder — **do not** fall back to overwriting oracle values with Coinbase data.

### 9.3 What not to do

- Do not change `fetchOraclePrices`, `refetchInterval`, or MCP oracle/contract tools for this feature.
- Do not merge Coinbase price into `OraclePrices` or pass live prices into buy-shares / wagmi flows.
- Do not remove GBP/Gold/FTSE from on-chain poll in favor of external feeds in v1.
- Do not add smart contract reads/writes in ingest, gateway, or `LiveTicker` beyond what already exists elsewhere in the app.

---

## 10. Monorepo layout

New backend apps live under **`apps/integrations/`** — the layer that connects to external systems (streams, APIs, and later DB/GraphQL). **Data** is what this layer returns upward to `web` and `mcp`; the folder name describes the role, not the payload.

```
apps/
  web/                          # presentation (unchanged)
  mcp/                          # AI/automation (unchanged)
  integrations/
    ingest/                     # Coinbase + Infura → Redis (this PRD)
    gateway/                    # Redis → browser WebSockets (this PRD)
    api/                        # future: GraphQL + DB + external REST (out of scope here)
libs/
  live-feed-types/              # optional: shared message types / Zod schemas
```

| Project path | Nx project name (suggested) | Role |
|--------------|----------------------------|------|
| `apps/integrations/ingest` | `integrations-ingest` | Coinbase + Infura → Redis |
| `apps/integrations/gateway` | `integrations-gateway` | Redis → browser WebSockets |
| `libs/live-feed-types` | `live-feed-types` | Shared TS types (optional) |
| `apps/web` | `web` | `LiveTicker` + hook only |

**Workspace:** Extend `pnpm-workspace.yaml` so nested packages resolve, e.g. add `apps/integrations/*` alongside existing `apps/*`.

**Suggested Nx targets:** `integrations-ingest:serve`, `integrations-gateway:serve`, plus `test` per project.

**Local dev order:** Redis → `integrations-ingest` → `integrations-gateway` → `web:serve` with `NEXT_PUBLIC_WS_LIVE_URL`.

---

## 11. Security

- All upstream and Redis credentials server-side only.
- Treat WS stream as **public read** unless auth is added later.
- Document UX note: Coinbase spot and Infura chain data are **indicative display**; they are not used by smart contracts in this feature. On-chain oracle polling remains separate.
- Rate-limit WS connections; no arbitrary Redis command exposure via WS.

---

## 12. Observability

- Ingest: upstream connect/disconnect, publish rate, reconnect count, Redis errors.
- Gateway: active clients, fan-out rate, lag (`ts` → send).
- Structured logs; optional metrics in phase 2.

---

## 13. Testing

| Layer | Approach |
|-------|----------|
| Unit | Normalization fixtures (Coinbase ticker JSON, Infura `eth_subscription` samples) |
| Integration | Redis test container: publish → gateway → test WS client |
| Web | Mock WS in RTL; assert `OraclePrices` still calls `fetchOraclePrices` on interval |
| Regression | Cucumber: oracle row still present; live row updates on mock WS message |

CI should not depend on live Coinbase/Infura; use recorded fixtures.

---

## 14. Rollout

### Phase 1 (MVP)

- Redis, `apps/integrations/ingest` (Coinbase + `newHeads`), `apps/integrations/gateway`, `LiveTicker` in header
- `OraclePrices` untouched

### Phase 2

- Optional Infura `logs` channel for display-only activity lines
- Last-value snapshot on WS connect

### Phase 3

- Extra Coinbase products for display; multiple gateway replicas
- No MCP or smart-contract coupling unless explicitly scoped in a separate PRD

---

## 15. Acceptance criteria

- [ ] `OraclePrices` still polls `OracleRouter` every 30 s with same fields and formatting.
- [ ] Live ticker path has no smart contract reads/writes and does not feed buy-shares or MCP tools.
- [ ] New live strip shows Coinbase ETH/USD updating without full page reload when ingest + gateway run.
- [ ] `newHeads` updates block indicator within one block of chain progression.
- [ ] Stopping ingest/gateway does not break oracle row; live strip shows offline/delayed only.
- [ ] Two gateway instances receive identical Redis messages from one ingest process.
- [ ] No `INFURA_*` / `COINBASE_*` in client bundle.
- [ ] Docs describe dual data planes and local startup order.

---

## 16. Open questions

1. Visual placement: second header row vs compact inline next to oracle strip?
2. Whether phase 2 log display is needed at all, given display-only / no contract integration scope?
3. Target chain for Infura when user wallet is on a different chain?
4. WS gateway auth in production?
5. Redis host (Docker local, Upstash, ElastiCache) and TLS termination.

---

## 17. References

- [Coinbase Advanced Trade WebSocket](https://docs.cdp.coinbase.com/advanced-trade/docs/ws-overview)
- [Infura WebSockets](https://docs.infura.io/api/networks/ethereum/how-to/use-websockets)
- [Redis Pub/Sub](https://redis.io/docs/latest/develop/interact/pubsub/)
- `apps/web/src/components/OraclePrices.tsx` — existing on-chain polling (do not replace; separate from live ticker)
