/**
 * Brickbase integrations ingest — Coinbase + Infura → Redis pub/sub.
 * Display-only live feeds; no smart contract integration.
 */
import { ingestConfig, getInfuraWsUrl } from "./config.js";
import { startCoinbaseFeed } from "./coinbaseFeed.js";
import { startInfuraFeed } from "./infuraFeed.js";
import { RedisPublisher } from "./redisPublisher.js";

const publisher = new RedisPublisher(
  ingestConfig.redisUrl,
  ingestConfig.lastValueTtlSeconds
);

await publisher.connect();

const stops: Array<() => void> = [];

stops.push(
  startCoinbaseFeed({
    wsUrl: ingestConfig.coinbaseWsUrl,
    productId: ingestConfig.coinbaseProductId,
    publishIntervalMs: ingestConfig.tickerPublishIntervalMs,
    publisher,
  })
);

const infuraWsUrl = getInfuraWsUrl(
  ingestConfig.infuraProjectId,
  ingestConfig.infuraWsNetwork
);

if (infuraWsUrl) {
  stops.push(
    startInfuraFeed({
      wsUrl: infuraWsUrl,
      chainId: ingestConfig.chainId,
      publisher,
    })
  );
} else {
  console.error(
    "[ingest][infura] skipped — set INFURA_PROJECT_ID and INFURA_WS_NETWORK"
  );
}

console.error("[ingest] running (Coinbase ticker + Infura newHeads when configured)");

const shutdown = async () => {
  for (const stop of stops) stop();
  await publisher.disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
