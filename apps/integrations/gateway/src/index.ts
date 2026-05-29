/**
 * Brickbase integrations gateway — Redis pub/sub → browser WebSockets.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createClient, type RedisClientType } from "redis";
import { WebSocketServer, type WebSocket } from "ws";
import {
  GATEWAY_SUBSCRIBE_CHANNELS,
  lastValueKey,
  parseLiveFeedMessage,
} from "@brickbase/integrations-types";
import { gatewayConfig, isOriginAllowed } from "./config.js";

const clients = new Set<WebSocket>();
const connectionsPerIp = new Map<string, number>();

function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.socket.remoteAddress ?? "unknown";
}

function broadcast(payload: string): void {
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

const redisReader: RedisClientType = createClient({ url: gatewayConfig.redisUrl });
const redisSubscriber: RedisClientType = redisReader.duplicate();

redisReader.on("error", (err) => console.error("[gateway][redis] error:", err.message));
redisSubscriber.on("error", (err) =>
  console.error("[gateway][redis-sub] error:", err.message)
);

await redisReader.connect();
await redisSubscriber.connect();
console.error("[gateway][redis] connected");

for (const channel of GATEWAY_SUBSCRIBE_CHANNELS) {
  await redisSubscriber.subscribe(channel, (message) => {
    broadcast(message);
  });
}

const httpServer = createServer(async (req, res) => {
  if (req.url === "/health") {
    const ok = redisReader.isOpen;
    res.writeHead(ok ? 200 : 503, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: ok ? "ok" : "degraded",
        clients: clients.size,
        redis: ok,
      })
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (url.pathname !== gatewayConfig.wsPath) {
    socket.destroy();
    return;
  }

  if (!isOriginAllowed(req.headers.origin)) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  const ip = getClientIp(req);
  const count = connectionsPerIp.get(ip) ?? 0;
  if (count >= gatewayConfig.maxConnectionsPerIp) {
    socket.write("HTTP/1.1 429 Too Many Requests\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    connectionsPerIp.set(ip, count + 1);
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", async (ws, req) => {
  const ip = getClientIp(req);
  clients.add(ws);

  for (const channel of GATEWAY_SUBSCRIBE_CHANNELS) {
    const snapshot = await redisReader.get(lastValueKey(channel));
    if (snapshot && parseLiveFeedMessage(snapshot)) {
      ws.send(snapshot);
    }
  }

  const heartbeat = setInterval(() => {
    if (ws.readyState === ws.OPEN) ws.ping();
  }, gatewayConfig.heartbeatIntervalMs);

  let idleTimer = setTimeout(
    () => ws.close(1000, "Idle timeout"),
    gatewayConfig.idleTimeoutMs
  );
  const armIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(
      () => ws.close(1000, "Idle timeout"),
      gatewayConfig.idleTimeoutMs
    );
  };

  ws.on("message", (data) => {
    const text = data.toString();
    armIdle();
    if (text.length > gatewayConfig.maxMessageBytes) {
      ws.close(1009, "Message too large");
      return;
    }
    if (text === "ping") {
      ws.send("pong");
    }
  });

  ws.on("pong", armIdle);

  ws.on("close", () => {
    clients.delete(ws);
    clearInterval(heartbeat);
    clearTimeout(idleTimer);
    const current = connectionsPerIp.get(ip) ?? 1;
    if (current <= 1) connectionsPerIp.delete(ip);
    else connectionsPerIp.set(ip, current - 1);
  });
});

httpServer.listen(gatewayConfig.port, () => {
  console.error(
    `[gateway] listening on http://localhost:${gatewayConfig.port} ws path ${gatewayConfig.wsPath}`
  );
});

const shutdown = async () => {
  for (const client of clients) client.close();
  httpServer.close();
  await redisSubscriber.quit();
  await redisReader.quit();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
