"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useShowAsset } from "./OptimisticAssetProvider";

export function AssetDetailLink({
  href,
  assetId,
  className,
  children,
}: {
  href: string;
  assetId: number;
  className?: string;
  children: ReactNode;
}) {
  const showAsset = useShowAsset();
  return (
    <Link href={href} className={className} onClick={() => showAsset(assetId)}>
      {children}
    </Link>
  );
}
