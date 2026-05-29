import { z } from "zod";

const baseSchema = z.object({
  v: z.literal(1),
  ts: z.number(),
});

export const tickerMessageSchema = baseSchema.extend({
  type: z.literal("ticker"),
  source: z.literal("coinbase"),
  symbol: z.string(),
  price: z.string(),
  change24h: z.string().optional(),
  volume24h: z.string().optional(),
});

export const chainHeadMessageSchema = baseSchema.extend({
  type: z.literal("chain_head"),
  source: z.literal("infura"),
  chainId: z.number(),
  blockNumber: z.string(),
  blockHash: z.string(),
  timestamp: z.number(),
});

export const chainLogMessageSchema = baseSchema.extend({
  type: z.literal("chain_log"),
  source: z.literal("infura"),
  chainId: z.number(),
  blockNumber: z.string(),
  transactionHash: z.string(),
  address: z.string(),
  topics: z.array(z.string()),
  label: z.string().optional(),
});

export const liveFeedMessageSchema = z.discriminatedUnion("type", [
  tickerMessageSchema,
  chainHeadMessageSchema,
  chainLogMessageSchema,
]);

export function parseLiveFeedMessage(raw: string): z.infer<typeof liveFeedMessageSchema> | null {
  try {
    const json: unknown = JSON.parse(raw);
    const result = liveFeedMessageSchema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
