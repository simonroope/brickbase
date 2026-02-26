import { AssetCard } from "./AssetCard";
import type { AssetSummary } from "@/lib/contracts";

export function AssetList({ assets }: { assets: AssetSummary[] }) {
  if (!assets?.length) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center">
        <p className="text-zinc-600">
          No properties listed yet. Configure contract addresses in .env to
          connect to the blockchain.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((p) => (
        <AssetCard key={p.assetId} asset={p} />
      ))}
    </div>
  );
}
