import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv();

export const ingestConfig = {
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  infuraProjectId: process.env.INFURA_PROJECT_ID ?? "",
  infuraWsNetwork: process.env.INFURA_WS_NETWORK ?? "sepolia",
  chainId: Number(process.env.CHAIN_ID ?? "11155111"),
  coinbaseWsUrl:
    process.env.COINBASE_WS_URL ?? "wss://advanced-trade-ws.coinbase.com",
  coinbaseProductId: process.env.COINBASE_PRODUCT_ID ?? "ETH-USD",
  tickerPublishIntervalMs: Number(process.env.TICKER_PUBLISH_INTERVAL_MS ?? "250"),
  lastValueTtlSeconds: Number(process.env.LIVE_LAST_VALUE_TTL_SECONDS ?? "86400"),
};

const INFURA_NETWORK_HOSTS: Record<string, string> = {
  mainnet: "mainnet.infura.io",
  sepolia: "sepolia.infura.io",
  "base-mainnet": "base-mainnet.infura.io",
  base: "base-mainnet.infura.io",
  "base-sepolia": "base-sepolia.infura.io",
};

export function getInfuraWsUrl(projectId: string, network: string): string | null {
  const host = INFURA_NETWORK_HOSTS[network];
  if (!host || !projectId) return null;
  return `wss://${host}/ws/v3/${projectId}`;
}
