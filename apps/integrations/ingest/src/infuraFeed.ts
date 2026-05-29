import WebSocket from "ws";
import {
  LIVE_CHANNELS,
  LIVE_FEED_SCHEMA_VERSION,
  type ChainHeadMessage,
} from "@brickbase/integrations-types";
import type { RedisPublisher } from "./redisPublisher.js";

export interface InfuraFeedOptions {
  wsUrl: string;
  chainId: number;
  publisher: RedisPublisher;
}

/** Parse Infura eth_subscription newHeads notification. */
export function parseInfuraNewHead(
  raw: string,
  chainId: number
): Omit<ChainHeadMessage, "v" | "type" | "ts" | "source"> | null {
  try {
    const data = JSON.parse(raw) as {
      method?: string;
      params?: {
        result?: {
          number?: string;
          hash?: string;
          timestamp?: string;
        };
      };
    };

    if (data.method !== "eth_subscription" || !data.params?.result) {
      return null;
    }

    const { number, hash, timestamp } = data.params.result;
    if (!number || !hash || !timestamp) return null;

    return {
      chainId,
      blockNumber: String(parseInt(number, 16)),
      blockHash: hash,
      timestamp: parseInt(timestamp, 16),
    };
  } catch {
    return null;
  }
}

export function startInfuraFeed(options: InfuraFeedOptions): () => void {
  const { wsUrl, chainId, publisher } = options;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let backoffMs = 1000;
  let requestId = 1;

  const subscribeNewHeads = () => {
    ws?.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: requestId++,
        method: "eth_subscribe",
        params: ["newHeads"],
      })
    );
  };

  const connect = () => {
    if (stopped) return;
    ws = new WebSocket(wsUrl);

    ws.on("open", () => {
      console.error("[ingest][infura] connected");
      backoffMs = 1000;
      subscribeNewHeads();
    });

    ws.on("message", async (data) => {
      const head = parseInfuraNewHead(data.toString(), chainId);
      if (!head) return;

      const msg: ChainHeadMessage = {
        v: LIVE_FEED_SCHEMA_VERSION,
        type: "chain_head",
        ts: Date.now(),
        source: "infura",
        ...head,
      };

      try {
        await publisher.publish(LIVE_CHANNELS.CHAIN_HEAD, msg);
      } catch (err) {
        console.error("[ingest][infura] publish failed:", err);
      }
    });

    ws.on("close", () => {
      console.error("[ingest][infura] disconnected");
      scheduleReconnect();
    });

    ws.on("error", (err) => {
      console.error("[ingest][infura] error:", err.message);
      ws?.close();
    });
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      backoffMs = Math.min(backoffMs * 2, 30_000);
      connect();
    }, backoffMs);
  };

  connect();

  return () => {
    stopped = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
