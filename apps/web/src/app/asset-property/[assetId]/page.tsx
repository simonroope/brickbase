import { AssetDetail } from "@/components/AssetDetail";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId: assetIdParam } = await params;
  const assetId = parseInt(assetIdParam, 10);
  if (Number.isNaN(assetId) || assetId < 1) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-text-secondary">Invalid asset ID.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <AssetDetail assetId={assetId} />
    </main>
  );
}
