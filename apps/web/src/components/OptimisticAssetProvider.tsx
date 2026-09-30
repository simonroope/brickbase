"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type OptimisticAssetContextValue = {
  showAsset: (assetId: number) => void;
  clearAsset: () => void;
  assetId: number | null;
};

const OptimisticAssetContext = createContext<OptimisticAssetContextValue | null>(
  null
);

const noop: OptimisticAssetContextValue = {
  showAsset: () => {},
  clearAsset: () => {},
  assetId: null,
};

export function parseAssetPropertyId(pathname: string): number | null {
  const match = pathname.match(/^\/asset-property\/(\d+)$/);
  if (!match) return null;
  const assetId = Number(match[1]);
  return Number.isInteger(assetId) && assetId >= 1 ? assetId : null;
}

export function useOptimisticAsset(): OptimisticAssetContextValue {
  return useContext(OptimisticAssetContext) ?? noop;
}

export function useShowAsset(): (assetId: number) => void {
  return useOptimisticAsset().showAsset;
}

export function OptimisticAssetProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [optimisticId, setOptimisticId] = useState<number | null>(null);
  const [openedFrom, setOpenedFrom] = useState<string | null>(null);

  const showAsset = useCallback(
    (assetId: number) => {
      setOpenedFrom(pathname);
      setOptimisticId(assetId);
    },
    [pathname]
  );

  const clearAsset = useCallback(() => {
    setOpenedFrom(null);
    setOptimisticId(null);
  }, []);

  const pathId = parseAssetPropertyId(pathname);
  if (pathId != null && (optimisticId != null || openedFrom != null)) {
    setOptimisticId(null);
    setOpenedFrom(null);
  }

  const assetId = pathId ?? (openedFrom === pathname ? optimisticId : null);

  return (
    <OptimisticAssetContext.Provider value={{ showAsset, clearAsset, assetId }}>
      {children}
    </OptimisticAssetContext.Provider>
  );
}
