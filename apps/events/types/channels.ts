/** Redis pub/sub channels for display-only live feeds. */
export const LIVE_CHANNELS = {
  TICKER_ETH_USD: "brickbase:live:ticker:eth-usd",
  CHAIN_HEAD: "brickbase:live:chain:head",
} as const;

export type LiveChannel = (typeof LIVE_CHANNELS)[keyof typeof LIVE_CHANNELS];

/** All v1 channels the gateway subscribes to. */
export const GATEWAY_SUBSCRIBE_CHANNELS: LiveChannel[] = [
  LIVE_CHANNELS.TICKER_ETH_USD,
  LIVE_CHANNELS.CHAIN_HEAD,
];

const LAST_VALUE_PREFIX = "brickbase:live:last:";

/** Last-value Redis key for snapshot-on-connect (24h TTL set by ingest). */
export function lastValueKey(channel: LiveChannel): string {
  const suffix = channel.replace("brickbase:live:", "");
  return `${LAST_VALUE_PREFIX}${suffix}`;
}
