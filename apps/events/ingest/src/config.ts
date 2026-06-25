import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv();

export const ingestConfig = {
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  infuraProjectId: process.env.INFURA_PROJECT_ID ?? "",
  ethereumRpcUrl: process.env.ETHEREUM_RPC_URL ?? "",
  chainId: Number(process.env.CHAIN_ID ?? "11155111"),
  coinbaseWsUrl:
    process.env.COINBASE_WS_URL ?? "wss://advanced-trade-ws.coinbase.com",
  coinbaseProductId: process.env.COINBASE_PRODUCT_ID ?? "ETH-USD",
  tickerPublishIntervalMs: Number(process.env.TICKER_PUBLISH_INTERVAL_MS ?? "250"),
  lastValueTtlSeconds: Number(process.env.LIVE_LAST_VALUE_TTL_SECONDS ?? "86400"),
};

/**
 * Derives the Infura WebSocket URL from the HTTP RPC URL.
 * https://sepolia.infura.io/v3/ → wss://sepolia.infura.io/ws/v3/{projectId}
 */
export function getInfuraWsUrl(projectId: string, rpcUrl: string): string | null {
  if (!projectId || !rpcUrl) return null;
  try {
    const { hostname } = new URL(rpcUrl);
    return `wss://${hostname}/ws/v3/${projectId}`;
  } catch {
    return null;
  }
}
