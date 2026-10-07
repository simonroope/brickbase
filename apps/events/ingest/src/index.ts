/**
 * Brickbase events ingest — Coinbase + Infura → Redis pub/sub.
 * Display-only live feeds; no smart contract integration.
 */
import { chainHeadLogLabel, ingestConfig, getChainHeadWsUrl } from "./config.js";
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

const chainHeadWsUrl = getChainHeadWsUrl(
  ingestConfig.infuraProjectId,
  ingestConfig.rpcUrl,
  ingestConfig.infuraWsNetwork
);

if (chainHeadWsUrl) {
  stops.push(
    startInfuraFeed({
      wsUrl: chainHeadWsUrl,
      chainId: ingestConfig.chainId,
      publisher,
    })
  );
} else {
  console.error(
    `[ingest][${chainHeadLogLabel(ingestConfig.chainId)}] skipped — set RPC_URL (Hardhat locally, or Infura + INFURA_PROJECT_ID)`
  );
}

console.error("[ingest] running (Coinbase ticker + chain newHeads when configured)");

const shutdown = async () => {
  for (const stop of stops) stop();
  await publisher.disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
