import { Header } from "@/components/Header";
import { AssetList } from "@/components/AssetList";
import { fetchAssets } from "@/lib/contracts";

export default async function HomePage() {
  const assets = await fetchAssets();
  return (
    <div className="min-h-screen bg-page">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold text-text-primary">
          Invest in Real Estate
        </h1>
        <AssetList assets={assets} />
      </main>
    </div>
  );
}
