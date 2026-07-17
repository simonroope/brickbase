# Events

The display-only live-feeds pipeline: `ingest` normalises upstream market and chain data into Redis pub/sub, and `gateway` relays it to browsers over WebSockets. It does not read smart-contract state.

## Pipeline roles

**Ingest**:
The upstream-facing service. Connects out to Coinbase and Infura, parses their payloads into normalised `LiveFeedMessage`s, and publishes them to Redis. The only writer of Redis.
_Avoid_: producer, collector

**Gateway**:
The browser-facing service. Subscribes to Redis channels and fan-out-broadcasts each message to connected browser WebSocket clients. A read-only relay; never writes feed data.
_Avoid_: server (unqualified), proxy

## Feeds

**Coinbase ticker feed**:
The subscription to Coinbase's `ticker` channel for a product (default ETH-USD), producing `TickerMessage`s.
_Avoid_: price feed, market feed

**Infura newHeads feed**:
The `eth_subscribe`/`newHeads` subscription over Infura, emitting one `ChainHeadMessage` per new block head. Carries block metadata only — no contract state.
_Avoid_: block feed, chain feed

## Messages

**LiveFeedMessage**:
The wire format: a discriminated union (on `type`) of all feed messages, wrapped in the `LiveFeedBase` envelope (`v`, `type`, `ts`, `source`). Imported as `@brickbase/events-types`.
_Avoid_: event, payload (unqualified)

**TickerMessage**:
A `ticker` message from Coinbase: `symbol`, `price`, optional 24h change/volume.

**ChainHeadMessage**:
A `chain_head` message from Infura: `chainId`, `blockNumber`, `blockHash`, `timestamp`.

**ChainLogMessage**:
A `chain_log` message type — defined and schema-validated but not yet produced by any feed and mapped to no channel. Reserved for future EVM log streaming.
_Avoid_: treating chain_log as live

## Channels

**LIVE_CHANNELS**:
The canonical Redis channel registry: `TICKER_ETH_USD` (`brickbase:live:ticker:eth-usd`) and `CHAIN_HEAD` (`brickbase:live:chain:head`).

**Channel naming**:
`brickbase:live:<feed-type>[:<subkey>]`. The `brickbase:live:` prefix marks display-only live feeds.

**Last value / snapshot-on-connect**:
On each publish, ingest also stores the message under a `brickbase:live:last:` key (24h TTL); on connect, gateway sends each channel's last value so clients get an immediate snapshot.
_Avoid_: cache (unqualified)
