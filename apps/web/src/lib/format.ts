/**
 * Format bigint values for display (USDC 6 decimals, share price 18 decimals).
 */
export function formatUsdc(value: bigint): string {
  const num = Number(value) / 1e6;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatOracleInt(value: bigint): string {
  const num = Number(value) / 1e8;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "symbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatOracleNum(value: bigint): string {
  const num = Number(value) / 1e8;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "symbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatInt(value: bigint): string {
  const num = Number(value) / 1e18;
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNum(value: bigint): string {
  const num = Number(value) / 1e18;
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export const ASSET_STATUS: Record<number, string> = {
  0: "Active",
  1: "Under Contract",
  2: "Sold",
  3: "Suspended",
};
