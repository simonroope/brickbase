import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv();

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const gatewayConfig = {
  port: Number(process.env.GATEWAY_PORT ?? "8081"),
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  wsPath: process.env.GATEWAY_WS_PATH ?? "/ws/live",
  allowedOrigins: (process.env.GATEWAY_ALLOWED_ORIGINS ?? appUrl)
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  maxConnectionsPerIp: Number(process.env.GATEWAY_MAX_CONNECTIONS_PER_IP ?? "20"),
  maxMessageBytes: Number(process.env.GATEWAY_MAX_MESSAGE_BYTES ?? "65536"),
  heartbeatIntervalMs: Number(process.env.GATEWAY_HEARTBEAT_INTERVAL_MS ?? "30000"),
  idleTimeoutMs: Number(process.env.GATEWAY_IDLE_TIMEOUT_MS ?? "300000"),
};

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (gatewayConfig.allowedOrigins.includes("*")) return true;
  return gatewayConfig.allowedOrigins.some(
    (allowed) => origin === allowed || origin.startsWith(allowed.replace(/\/$/, ""))
  );
}
