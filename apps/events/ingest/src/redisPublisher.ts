import { createClient, type RedisClientType } from "redis";
import {
  lastValueKey,
  type LiveChannel,
  type LiveFeedMessage,
} from "@brickbase/events-types";

export class RedisPublisher {
  private client: RedisClientType | null = null;

  constructor(
    private readonly redisUrl: string,
    private readonly lastValueTtlSeconds: number
  ) {}

  async connect(): Promise<void> {
    this.client = createClient({ url: this.redisUrl });
    this.client.on("error", (err) => {
      console.error("[ingest][redis] error:", err.message);
    });
    await this.client.connect();
    console.error("[ingest][redis] connected");
  }

  async disconnect(): Promise<void> {
    await this.client?.quit();
    this.client = null;
  }

  async publish(channel: LiveChannel, message: LiveFeedMessage): Promise<void> {
    if (!this.client?.isOpen) {
      throw new Error("Redis client not connected");
    }
    const payload = JSON.stringify(message);
    await this.client.publish(channel, payload);
    await this.client.setEx(lastValueKey(channel), this.lastValueTtlSeconds, payload);
  }
}
