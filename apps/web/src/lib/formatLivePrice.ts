/** Format a decimal string spot price for display (display-only live feed). */
export function formatLivePrice(price: string): string {
  const n = Number(price);
  if (!Number.isFinite(n)) return price;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
