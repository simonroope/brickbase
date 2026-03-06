import { Header } from "@/components/Header";
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
      <div className="min-h-screen bg-page">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <p className="text-text-secondary">Invalid asset ID.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <AssetDetail assetId={assetId} />
      </main>
    </div>
  );
}
