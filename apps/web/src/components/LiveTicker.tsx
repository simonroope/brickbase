"use client";

import { useLiveFeedWebSocket } from "@/hooks/useLiveFeedWebSocket";
import { formatLivePrice } from "@/lib/formatLivePrice";

function statusLabel(status: "live" | "delayed" | "offline"): string {
  if (status === "live") return "live";
  if (status === "delayed") return "delayed";
  return "offline";
}

export function LiveTicker() {
  const { status, ticker, chainHead } = useLiveFeedWebSocket();

  const ethPrice = ticker?.price ? formatLivePrice(ticker.price) : "--";
  const blockLabel = chainHead?.blockNumber ? `#${chainHead.blockNumber}` : "--";

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-4 text-sm text-header-text-muted"
      title="Coinbase spot and chain head — display only, not used for on-chain transactions"
    >
      <span className="flex items-center gap-1.5">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            status === "live"
              ? "bg-emerald-400"
              : status === "delayed"
                ? "bg-amber-400"
                : "bg-gray-500"
          }`}
          aria-hidden
        />
        <span className="text-xs uppercase tracking-wide text-header-text-muted/80">
          {statusLabel(status)}
        </span>
      </span>
      <span>
        <span className="font-semibold text-header-text">ETH/USD:</span>{" "}
        {ethPrice}
      </span>
      <span>
        <span className="font-semibold text-header-text">Block:</span> {blockLabel}
      </span>
    </div>
  );
}
