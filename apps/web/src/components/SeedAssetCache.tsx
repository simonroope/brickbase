"use client";

import { useLayoutEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  deserializeAssetDetail,
  type AssetDetailJson,
} from "@/lib/contracts";

/** Seeds the asset query cache from the homepage list so detail navigation is instant. */
export function SeedAssetCache({ assets }: { assets: AssetDetailJson[] }) {
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    for (const asset of assets) {
      queryClient.setQueryData(["asset", asset.assetId], deserializeAssetDetail(asset));
    }
  }, [assets, queryClient]);

  return null;
}
