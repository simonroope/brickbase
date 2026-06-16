export const LIVE_FEED_SCHEMA_VERSION = 1;

export type LiveFeedSource = "coinbase" | "infura";
export type LiveFeedType = "ticker" | "chain_head" | "chain_log";

export interface LiveFeedBase {
  v: typeof LIVE_FEED_SCHEMA_VERSION;
  type: LiveFeedType;
  ts: number;
  source: LiveFeedSource;
}

export interface TickerMessage extends LiveFeedBase {
  type: "ticker";
  source: "coinbase";
  symbol: string;
  price: string;
  change24h?: string;
  volume24h?: string;
}

export interface ChainHeadMessage extends LiveFeedBase {
  type: "chain_head";
  source: "infura";
  chainId: number;
  blockNumber: string;
  blockHash: string;
  timestamp: number;
}

export interface ChainLogMessage extends LiveFeedBase {
  type: "chain_log";
  source: "infura";
  chainId: number;
  blockNumber: string;
  transactionHash: string;
  address: string;
  topics: string[];
  label?: string;
}

export type LiveFeedMessage = TickerMessage | ChainHeadMessage | ChainLogMessage;
