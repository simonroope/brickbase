"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOraclePrices } from "@/lib/contracts";
import { formatOracleInt, formatOracleNum } from "@/lib/format";

export function OraclePrices() {
  const { data: prices, isLoading, isError, error } = useQuery({
    queryKey: ["oracle-prices"],
    queryFn: fetchOraclePrices,
    refetchInterval: 30_000,
  });

  if (isError && error) {
    return (
      <div className="flex flex-wrap gap-4 text-sm text-error">
        Oracle error: {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  if (isLoading || !prices) {
    return (
      <div className="flex flex-wrap gap-4 text-sm text-header-text-muted">
        <span><span className="font-semibold">ETH/USD:</span> --</span>
        <span><span className="font-semibold">GBP/USD:</span> --</span>
        <span><span className="font-semibold">Gold/USD:</span> --</span>
        <span><span className="font-semibold">FTSE 100:</span> --</span>
      </div>
    );
  }

  return (
      <div className="flex flex-wrap gap-4 text-sm text-header-text">
        <span><span className="font-semibold">ETH/USD:</span> {formatOracleInt(prices.ethUsd.price)}</span>
        <span><span className="font-semibold">GBP/USD:</span> {formatOracleInt(prices.gbpUsd.price)}</span>
        <span><span className="font-semibold">Gold/USD:</span> {formatOracleInt(prices.goldUsd.price)}</span>
        <span><span className="font-semibold">FTSE 100:</span> {formatOracleNum(prices.ftse100.value)}</span>
      </div>
  );
}
