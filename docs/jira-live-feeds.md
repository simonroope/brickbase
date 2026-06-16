# Jira ticket: Real-time display-only ticker feeds

**Issue key:** BRICK-XXX  
**Type:** Story  
**Epic:** Events layer / Investor portal UX  
**Priority:** Medium  
**Components:** `apps/events`, `apps/web`, `docs`  
**Labels:** `live-feeds`, `redis`, `websocket`, `display-only`  
**Story points:** 8  

**Implementation spec (output):** [pub-sub.md](./pub-sub.md)

---

## Summary

Add **display-only** live data feeds for the web header: Coinbase ETH/USD spot ticker and Infura block headers, delivered via **ingest → Redis pub/sub → WebSocket gateway → browser**.

---

## Background

The header has no live market or chain pulse. Coinbase and Infura WebSockets must not run inside the Next.js process (timeouts, connection limits). Future consumers (admin UI, alerts, additional integrations) need a decoupled event bus.

---

## Problem

- No live ETH/USD spot or block indicator in the UI.
- Upstream WebSocket sessions must be isolated from browser connections.
- Need horizontal fan-out for multiple clients and optional gateway replicas.

---

## Solution

1. **`apps/events/ingest`** — Coinbase Advanced Trade WS + Infura `newHeads` → Redis `PUBLISH` + last-value `SET`
2. **`apps/events/gateway`** — Redis `SUBSCRIBE` → WebSocket fan-out to browsers
3. **`apps/web`** — `LiveTicker` + `useLiveFeedWebSocket` in `Header`
4. **`docs/pub-sub.md`** — authoritative PRD / build specification

---

## Scope (Phase 1 / MVP)

- Shared types in `apps/events/types/` (`channels`, `messages`, Zod `schemas`)
- Ingest with reconnect, coalesced ticker publish (250 ms), graceful shutdown
- Gateway with `GET /health`, WS `/ws/live`, origin check, last-value snapshot on connect
- `LiveTicker` UI with `live` / `delayed` / `offline` states
- `docker-compose.live.yml` for local Redis
- Nx targets: `events:ingest`, `events:gateway`, `events:test`
- Unit tests (schema parsers, `formatLivePrice`) — no live Coinbase/Infura in CI
- README updates for install and run order

---

## Out of scope

- Replacing or modifying on-chain `OracleRouter` polling or MCP `get_oracle_prices`
- Smart contract reads/writes from live feeds
- Using live data in buy-shares, settlement, or MCP contract tools
- Infura `logs` subscription and `ChainLogMessage` UI (Phase 2)
- WS authentication, managed Redis, production TLS (Phase 3)

---

## Deliverables

| Deliverable | Description |
|-------------|-------------|
| `docs/pub-sub.md` | PRD / build spec for the feature |
| `apps/events/` | `types/`, `ingest/src/`, `gateway/src/`, single `package.json` + `project.json` |
| `apps/web` | `LiveTicker`, `useLiveFeedWebSocket`, `formatLivePrice`; `Header` composition |
| Config | `.env.example` live-feed variables; root npm scripts |
| Tests | `nx run events:test`; Jest for `formatLivePrice` |

---

## Technical constraints

- One `package.json` per app folder under `apps/events` (no nested package manifests)
- Import alias: `@brickbase/events-types` (mirrored in web `tsconfig` + `next.config.ts`)
- All Coinbase/Infura/Redis credentials server-side only — no secrets in client bundle
- Ingest must run Coinbase even when `INFURA_PROJECT_ID` is unset

---

## Acceptance criteria (BDD)

### Oracle independence

```gherkin
Scenario: On-chain oracle polling is unchanged
  Given the web app is running with valid OracleRouter addresses configured
  When I view the header oracle strip
  Then I see ETH/USD, GBP/USD, Gold/USD, and FTSE 100 from OracleRouter
  And the oracle data refreshes every 30 seconds via React Query
  And OraclePrices.tsx and fetchOraclePrices are not modified for live feeds
```

```gherkin
Scenario: MCP oracle tools are unaffected
  Given the MCP server is running with deployed contracts
  When I call the get_oracle_prices tool
  Then I receive on-chain oracle prices from OracleRouter
  And no MCP tool reads from the live WebSocket or Redis pipeline
```

### Display-only scope

```gherkin
Scenario: Live feeds are display-only
  Given ingest and gateway are running
  When LiveTicker shows an ETH/USD spot price
  Then that price is sourced from Coinbase via the WebSocket pipeline
  And the live price is not used in buy-shares or wagmi transaction flows
  And ingest does not require deployed contract addresses or @brickbase/abi
```

### Ingest pipeline

```gherkin
Scenario: Coinbase ticker is published to Redis
  Given Redis is running
  And ingest is started with valid Coinbase configuration
  When Coinbase sends ETH-USD ticker updates
  Then ingest publishes TickerMessage JSON to brickbase:live:ticker:eth-usd
  And ingest sets brickbase:live:last:ticker:eth-usd with a TTL
  And publishes are coalesced at the configured interval while retaining the latest price
```

```gherkin
Scenario: Infura newHeads is published when configured
  Given Redis is running
  And ingest is started with INFURA_PROJECT_ID and INFURA_WS_NETWORK set
  When Infura emits a newHeads subscription event
  Then ingest publishes ChainHeadMessage JSON to brickbase:live:chain:head
  And blockNumber is a decimal string converted from hex
```

```gherkin
Scenario: Ingest runs without Infura credentials
  Given Redis is running
  And INFURA_PROJECT_ID is not set
  When ingest starts
  Then the Coinbase feed starts successfully
  And ingest logs that Infura was skipped
  And the process does not crash
```

```gherkin
Scenario: Ingest reconnects after upstream disconnect
  Given ingest is running and connected to Coinbase
  When the Coinbase WebSocket connection drops
  Then ingest logs the disconnect
  And reconnects with exponential backoff capped at 30 seconds
  And does not crash on malformed frames
```

### Gateway pipeline

```gherkin
Scenario: Gateway health check reports status
  Given gateway is running and connected to Redis
  When I GET http://localhost:8081/health
  Then the response status is 200
  And the JSON body includes status, clients, and redis fields
```

```gherkin
Scenario: Gateway delivers snapshot then live stream
  Given ingest has published ticker and chain head messages
  And gateway is running
  When a browser WebSocket client connects to /ws/live from an allowed origin
  Then the client receives last-value messages for available channels
  And subsequent Redis messages are forwarded to the client in real time
```

```gherkin
Scenario: Multiple gateway instances share one ingest
  Given one ingest process is publishing to Redis
  And two gateway instances are subscribed to the same channels
  When ingest publishes a ticker message
  Then both gateway instances receive the message
  And both forward it to their connected WebSocket clients
```

### Web UI

```gherkin
Scenario: LiveTicker updates without page reload
  Given ingest, gateway, and web dev server are running
  And NEXT_PUBLIC_WS_LIVE_URL points at the gateway
  When I open the web app header
  Then I see LiveTicker in the header ticker area
  And ETH/USD (live) price updates without a full page reload
  And a block indicator updates when Infura is configured
```

```gherkin
Scenario: LiveTicker shows connection status
  Given the WebSocket hook is connected and receiving messages
  When messages arrive within the stale threshold
  Then LiveTicker shows a live status indicator

  Given the WebSocket is connected but no message arrives for more than 10 seconds
  When LiveTicker renders
  Then it shows a delayed status indicator with last known values

  Given ingest or gateway is stopped
  When LiveTicker renders
  Then it shows an offline status indicator with placeholder values
  And the oracle strip continues to work independently
```

```gherkin
Scenario: Header layout preserves oracle row
  Given the web app header is rendered
  When I inspect the ticker area
  Then row 1 contains OraclePrices unchanged
  And row 2 contains LiveTicker below it
```

### Monorepo and documentation

```gherkin
Scenario: Events monorepo layout matches specification
  Given the feature branch is checked out
  When I inspect apps/events
  Then there is a single package.json and project.json at apps/events
  And types live in apps/events/types/ without a nested package.json
  And ingest/ and gateway/ have no separate package.json or project.json
  And docs/pub-sub.md exists as the implementation specification
```

```gherkin
Scenario: Unit tests pass without live upstreams
  Given dependencies are installed in apps/events
  When I run nx run events:test
  Then schema and parser tests pass
  And no live Coinbase or Infura connection is required

  Given apps/web dependencies are installed
  When I run the formatLivePrice unit test
  Then the test passes
```

### Security

```gherkin
Scenario: Upstream credentials stay server-side
  Given the web client bundle is built
  When I inspect the client bundle for live-feed configuration
  Then INFURA_PROJECT_ID and COINBASE credentials are not exposed
  And only NEXT_PUBLIC_WS_LIVE_URL is present for the browser
```

---

## Definition of Done

- [ ] `docs/pub-sub.md` merged and matches implemented layout
- [ ] Phase 1 acceptance scenarios pass locally (Redis + ingest + gateway + web)
- [ ] `nx run events:test` passes in CI without external WS dependencies
- [ ] README documents install and run order for events before web
- [ ] No changes to `OraclePrices` polling behavior or MCP oracle tools

---

## Rollout phases

| Phase | Scope |
|-------|--------|
| **1 (MVP)** | `apps/events`, `LiveTicker`, `docker-compose.live.yml`, unit tests |
| **2** | Infura `logs`, Redis integration test, mocked WS web tests |
| **3** | Extra Coinbase products, gateway replicas, `apps/events/api` |

---

## References

- [pub-sub.md](./pub-sub.md) — build specification
- [Coinbase Advanced Trade WebSocket](https://docs.cdp.coinbase.com/advanced-trade/docs/ws-overview)
- [Infura WebSockets](https://docs.infura.io/api/networks/ethereum/how-to/use-websockets)
- [Redis Pub/Sub](https://redis.io/docs/latest/develop/interact/pubsub/)
