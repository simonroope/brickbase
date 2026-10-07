"use client";

import { useQuery } from "@tanstack/react-query";
import { loadOraclePrices } from "@/lib/contracts";
import { formatOracleInt, formatOracleNum } from "@/lib/format";

const rowClass =
  "flex w-full flex-wrap items-center justify-center gap-4 text-sm";

export function OraclePrices() {
  const { data: prices } = useQuery({
    queryKey: ["oracle-prices"],
    queryFn: loadOraclePrices,
    refetchInterval: 60 * 60 * 1000,
    retry: false,
  });

  return (
    <div className={`${rowClass} ${prices ? "text-header-text" : "text-header-text-muted"}`}>
      <span>
        <span className="font-semibold">ETH/USD:</span>
        {prices ? ` ${formatOracleInt(prices.ethUsd.price)}` : ""}
      </span>
      <span>
        <span className="font-semibold">GBP/USD:</span>
        {prices ? ` ${formatOracleInt(prices.gbpUsd.price)}` : ""}
      </span>
      <span>
        <span className="font-semibold">Gold/USD:</span>
        {prices ? ` ${formatOracleInt(prices.goldUsd.price)}` : ""}
      </span>
      <span>
        <span className="font-semibold">FTSE 100:</span>
        {prices ? ` ${formatOracleNum(prices.ftse100.value)}` : ""}
      </span>
    </div>
  );
}
