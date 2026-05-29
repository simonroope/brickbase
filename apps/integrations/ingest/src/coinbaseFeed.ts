import WebSocket from "ws";
import {
  LIVE_CHANNELS,
  LIVE_FEED_SCHEMA_VERSION,
  type TickerMessage,
} from "@brickbase/integrations-types";
import type { RedisPublisher } from "./redisPublisher.js";

export interface CoinbaseFeedOptions {
  wsUrl: string;
  productId: string;
  publishIntervalMs: number;
  publisher: RedisPublisher;
}

/** Parse Coinbase Advanced Trade ticker channel payloads. */
export function parseCoinbaseTicker(
  raw: string,
  productId: string
): Pick<TickerMessage, "symbol" | "price" | "change24h" | "volume24h"> | null {
  try {
    const data = JSON.parse(raw) as {
      channel?: string;
      events?: Array<{
        type?: string;
        tickers?: Array<{
          product_id?: string;
          price?: string;
          price_percent_chg_24h?: string;
          volume_24h?: string;
        }>;
      }>;
    };

    if (data.channel !== "ticker" || !Array.isArray(data.events)) {
      return null;
    }

    for (const event of data.events) {
      const tickers = event.tickers ?? [];
      for (const t of tickers) {
        if (t.product_id === productId && t.price) {
          return {
            symbol: t.product_id,
            price: t.price,
            change24h: t.price_percent_chg_24h,
            volume24h: t.volume_24h,
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function startCoinbaseFeed(options: CoinbaseFeedOptions): () => void {
  const { wsUrl, productId, publishIntervalMs, publisher } = options;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let backoffMs = 1000;
  let latest: Pick<TickerMessage, "symbol" | "price" | "change24h" | "volume24h"> | null =
    null;
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  const flush = async () => {
    if (!latest) return;
    const msg: TickerMessage = {
      v: LIVE_FEED_SCHEMA_VERSION,
      type: "ticker",
      ts: Date.now(),
      source: "coinbase",
      ...latest,
    };
    try {
      await publisher.publish(LIVE_CHANNELS.TICKER_ETH_USD, msg);
    } catch (err) {
      console.error("[ingest][coinbase] publish failed:", err);
    }
  };

  const connect = () => {
    if (stopped) return;
    ws = new WebSocket(wsUrl);

    ws.on("open", () => {
      console.error("[ingest][coinbase] connected");
      backoffMs = 1000;
      ws?.send(
        JSON.stringify({
          type: "subscribe",
          product_ids: [productId],
          channel: "ticker",
        })
      );
      if (!flushTimer) {
        flushTimer = setInterval(() => void flush(), publishIntervalMs);
      }
    });

    ws.on("message", (data) => {
      const parsed = parseCoinbaseTicker(data.toString(), productId);
      if (parsed) latest = parsed;
    });

    ws.on("close", () => {
      console.error("[ingest][coinbase] disconnected");
      scheduleReconnect();
    });

    ws.on("error", (err) => {
      console.error("[ingest][coinbase] error:", err.message);
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
    if (flushTimer) clearInterval(flushTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
