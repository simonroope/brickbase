"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  parseLiveFeedMessage,
  type ChainHeadMessage,
  type TickerMessage,
} from "@brickbase/events-types";

export type LiveFeedStatus = "live" | "delayed" | "offline";

const DEFAULT_WS_URL = "ws://localhost:8081/ws/live";
const STALE_MS = 10_000;
const RECONNECT_MAX_MS = 30_000;

export interface LiveFeedState {
  status: LiveFeedStatus;
  ticker: TickerMessage | null;
  chainHead: ChainHeadMessage | null;
}

export function useLiveFeedWebSocket(): LiveFeedState {
  const [ticker, setTicker] = useState<TickerMessage | null>(null);
  const [chainHead, setChainHead] = useState<ChainHeadMessage | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectMs = useRef(1000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wsUrl =
    typeof process.env.WS_LIVE_URL === "string" &&
    process.env.WS_LIVE_URL.length > 0
      ? process.env.WS_LIVE_URL
      : DEFAULT_WS_URL;

  const handleMessage = useCallback((raw: string) => {
    const msg = parseLiveFeedMessage(raw);
    if (!msg) return;
    setLastMessageAt(Date.now());
    if (msg.type === "ticker") setTicker(msg);
    if (msg.type === "chain_head") setChainHead(msg);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectMs.current = 1000;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        handleMessage(String(event.data));
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (cancelled) return;
        reconnectTimer.current = setTimeout(() => {
          reconnectMs.current = Math.min(reconnectMs.current * 2, RECONNECT_MAX_MS);
          connect();
        }, reconnectMs.current);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [wsUrl, handleMessage]);

  let status: LiveFeedStatus = "offline";
  if (connected) {
    const stale = lastMessageAt === null || now - lastMessageAt > STALE_MS;
    status = stale ? "delayed" : "live";
  }

  return { status, ticker, chainHead };
}
