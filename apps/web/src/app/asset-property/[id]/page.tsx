import { Header } from "@/components/Header";
import { AssetDetail } from "@/components/AssetDetail";

export default async function AssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (Number.isNaN(assetId) || assetId < 1) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <p className="text-zinc-600">Invalid property ID.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <AssetDetail assetId={assetId} />
      </main>
    </div>
  );
}
