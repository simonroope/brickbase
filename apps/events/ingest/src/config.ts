import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { appendProjectId } from "@brickbase/chains";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv();

export const ingestConfig = {
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  infuraProjectId: process.env.INFURA_PROJECT_ID ?? "",
  rpcUrl: appendProjectId(process.env.RPC_URL ?? ""),
  infuraWsNetwork: process.env.INFURA_WS_NETWORK ?? "",
  chainId: Number(process.env.CHAIN_ID ?? "11155111"),
  coinbaseWsUrl:
    process.env.COINBASE_WS_URL ?? "wss://advanced-trade-ws.coinbase.com",
  coinbaseProductId: process.env.COINBASE_PRODUCT_ID ?? "ETH-USD",
  tickerPublishIntervalMs: Number(process.env.TICKER_PUBLISH_INTERVAL_MS ?? "250"),
  lastValueTtlSeconds: Number(process.env.LIVE_LAST_VALUE_TTL_SECONDS ?? "86400"),
};

const INFURA_WS_HOSTS: Record<string, string> = {
  mainnet: "mainnet.infura.io",
  sepolia: "sepolia.infura.io",
  base: "base-mainnet.infura.io",
  "base-mainnet": "base-mainnet.infura.io",
  "base-sepolia": "base-sepolia.infura.io",
};

const CHAIN_LOG_LABELS: Record<number, string> = {
  1: "mainnet",
  11155111: "sepolia",
  8453: "base",
  84532: "base-sepolia",
  31337: "hardhat",
};

export function chainHeadLogLabel(chainId: number): string {
  return CHAIN_LOG_LABELS[chainId] ?? `chain-${chainId}`;
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * newHeads WebSocket URL for this environment.
 * Local Hardhat (`http://127.0.0.1:8545`) → `ws://127.0.0.1:8545`.
 * Staging/production Infura HTTP → `wss://<host>/ws/v3/<projectId>`.
 */
export function getChainHeadWsUrl(
  projectId: string,
  rpcUrl: string,
  network = ""
): string | null {
  if (rpcUrl) {
    try {
      const url = new URL(rpcUrl);
      if (isLoopbackHostname(url.hostname)) {
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        return url.toString().replace(/\/$/, "");
      }
      if (url.hostname.endsWith(".infura.io")) {
        if (!projectId) return null;
        return `wss://${url.hostname}/ws/v3/${projectId}`;
      }
    } catch {
      return null;
    }
  }

  const hostFromNetwork = INFURA_WS_HOSTS[network];
  if (hostFromNetwork && projectId) {
    return `wss://${hostFromNetwork}/ws/v3/${projectId}`;
  }

  return null;
}
