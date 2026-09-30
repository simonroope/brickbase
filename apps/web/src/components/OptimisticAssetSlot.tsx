"use client";

import { type ReactNode } from "react";
import { AssetDetail } from "./AssetDetail";
import { useOptimisticAsset } from "./OptimisticAssetProvider";

export function OptimisticAssetSlot({ children }: { children: ReactNode }) {
  const { assetId } = useOptimisticAsset();
  if (assetId != null) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <AssetDetail assetId={assetId} />
      </main>
    );
  }
  return children;
}
