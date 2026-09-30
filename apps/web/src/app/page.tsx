import { AssetList } from "@/components/AssetList";
import { SeedAssetCache } from "@/components/SeedAssetCache";
import { fetchAssets, serializeAssetDetail } from "@/lib/contracts";
import { resolveDeployedAddress } from "@/lib/deployedAddresses";

void import("@/components/AssetDetail");

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const assets = await fetchAssets(
    resolveDeployedAddress("ASSET_VAULT_ADDRESS"),
    resolveDeployedAddress("ASSET_SHARES_ADDRESS")
  );
  const cache = assets.map((asset) => serializeAssetDetail({ ...asset, exists: true }));
  return (
    <>
      <SeedAssetCache assets={cache} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-text-primary">
          Invest in Real Estate
        </h1>
        <AssetList assets={assets} />
      </main>
    </>
  );
}
