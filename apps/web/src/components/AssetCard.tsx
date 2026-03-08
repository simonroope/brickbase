"use client";

import Link from "next/link";
import Image from "next/image";
import type { AssetSummary } from "@/lib/contracts";
import { formatInt, formatUsdc, ASSET_STATUS } from "@/lib/format";

export function AssetCard({ asset }: { asset: AssetSummary }) {
  const imageSrc = asset.metadata?.images?.[0];
  const statusLabel = ASSET_STATUS[asset.status] ?? "Unknown";

  const href = `/asset-property/${asset.assetId}`;

  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <Link href={href} className="block flex-1">
        <div className="relative h-48 w-full bg-surface-elevated">
          {imageSrc && (
            <Image
              src={imageSrc}
              alt={asset.metadata?.name ?? asset.metadata?.address ?? `Asset ${asset.assetId}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          )}
          <span className="absolute top-2 right-2 rounded-md bg-surface/90 px-2 py-0.5 text-xs font-medium text-text-tertiary">
            {statusLabel}
          </span>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-text-primary">
            {asset.metadata?.name ?? asset.metadata?.address ?? `Asset #${asset.assetId}`}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Location: {asset.metadata?.location}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Capital Value: {formatUsdc(asset.capitalValue)}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Income Value: {formatUsdc(asset.incomeValue)}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Share Price: {formatUsdc(asset.sharePrice)}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Available Shares: {formatInt(asset.availableSupply)}
          </p>
        </div>
      </Link>
      <div className="border-t border-border-subtle p-4">
        <Link
          href={href}
          className="block w-full rounded-md bg-brand px-4 py-2 text-center text-sm font-medium text-white hover:bg-brand-hover"
        >
          Buy Shares
        </Link>
      </div>
    </div>
  );
}
