"use client";

/**
 * Property details are viewable by all users (signed, unsigned, whitelisted or not).
 * Whitelist is only enforced when attempting to purchase shares (see BuyShares).
 */
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { fetchAssetDetail, getUserShareBalance, type AssetMetadata } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";
import { formatInt, formatUsdc, ASSET_STATUS } from "@/lib/format";
import { BuyShares } from "./BuyShares";

export function AssetDetail({ assetId }: { assetId: number }) {
  const { address } = useWallet();
  const { data: asset, isLoading, error } = useQuery({
    queryKey: ["asset", assetId],
    queryFn: () => fetchAssetDetail(assetId),
  });

  const { data: userBalance } = useQuery({
    queryKey: ["userShares", assetId, address],
    queryFn: () => (address ? getUserShareBalance(address as `0x${string}`, assetId) : Promise.resolve(BigInt(0))),
    enabled: !!address && !!asset,
  });

  if (isLoading || !asset) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-64 rounded-xl bg-surface-elevated" />
        <div className="h-8 w-1/3 bg-surface-elevated" />
        <div className="h-4 w-full bg-surface-elevated" />
      </div>
    );
  }

  if (error || !asset.exists) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted p-8 text-center">
        <p className="text-text-secondary">Property not found or no shares created yet.</p>
        <Link href="/" className="mt-4 inline-block text-brand hover:underline">
          ← Back to properties
        </Link>
      </div>
    );
  }

  const m = asset.metadata as AssetMetadata | null;
  const imageSrc = m?.images?.[0];
  const statusLabel = ASSET_STATUS[asset.status] ?? "Unknown";

  return (
    <div className="space-y-8">
      <Link href="/" className="inline-block text-sm text-brand hover:underline">
        ← Back to properties
      </Link>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="relative h-64 w-full bg-surface-elevated md:h-96">
          {imageSrc && (
            <Image
              src={imageSrc}
              alt={m?.address ?? `Property ${assetId}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          )}
          <span className="absolute top-4 right-4 rounded-md bg-surface/90 px-3 py-1 text-sm font-medium text-text-tertiary">
            {statusLabel}
          </span>
        </div>

        <div className="p-6 md:p-8">
          <h1 className="text-2xl font-bold text-text-primary">
            {m?.name ?? m?.address ?? `Asset #${assetId}`}
          </h1>

          {(m?.name || m?.assetType || m?.address || m?.purchasePrice != null || m?.purchaseDate || m?.area != null || m?.yearBuilt || m?.jurisdiction) && (
            <div className="mt-2 rounded-lg border border-border bg-surface-muted/50 p-4">
              <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-1 text-sm">
                {m?.name && (
                  <>
                    <dt className="text-text-secondary">Name:</dt>
                    <dd className="font-medium">{m.name}</dd>
                  </>
                )}
                {m?.address && (
                  <>
                    <dt className="text-text-secondary">Address:</dt>
                    <dd className="font-medium">{m.address}</dd>
                  </>
                )}
                {m?.jurisdiction && (
                  <>
                    <dt className="text-text-secondary">Jurisdiction:</dt>
                    <dd className="font-medium">{m.jurisdiction}</dd>
                  </>
                )}
                {m?.assetType && (
                  <>
                    <dt className="text-text-secondary">Type:</dt>
                    <dd className="font-medium">{m.assetType}</dd>
                  </>
                )}
                {m?.purchaseDate && (
                  <>
                    <dt className="text-text-secondary">Purchase Date:</dt>
                    <dd className="font-medium">{m.purchaseDate}</dd>
                  </>
                )}
                {m?.purchasePrice != null && (
                  <>
                    <dt className="text-text-secondary">Purchase Price:</dt>
                    <dd className="font-medium">{formatInt(m.purchasePrice)}</dd>
                  </>
                )}
                {m?.yearBuilt != null && (
                  <>
                    <dt className="text-text-secondary">Year Built:</dt>
                    <dd className="font-medium">{m.yearBuilt}</dd>
                  </>
                )}
                {m?.area != null && (
                  <>
                    <dt className="text-text-secondary">Area:</dt>
                    <dd className="font-medium">{formatInt(BigInt(m.area))}</dd>
                  </>
                )}
              </dl>
            </div>
          )}

          <div className="mt-6">
            <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-text-secondary">Capital Value:</dt>
              <dd className="font-medium">{formatInt(asset.capitalValue)}</dd>
              <dt className="text-text-secondary">Income Value:</dt>
              <dd className="font-medium">{formatInt(asset.incomeValue)}</dd>
              <dt className="text-text-secondary">Share Price:</dt>
              <dd className="font-medium">{formatUsdc(asset.sharePrice)}</dd>
              <dt className="text-text-secondary">Available Shares:</dt>
              <dd className="font-medium">{formatInt(asset.availableSupply)}</dd>
              {address && userBalance !== undefined && userBalance > BigInt(0) && (
                <>
                  <dt className="text-text-secondary">Your balance:</dt>
                  <dd className="font-medium">{userBalance.toString()} shares:</dd>
                </>
              )}
            </dl>
            <div className="mt-4">
              <BuyShares
                assetId={assetId}
                sharePrice={asset.sharePrice}
                availableSupply={asset.availableSupply}
              />
            </div>
          </div>

          {m?.images && m.images.length > 1 && (
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-medium text-text-muted">Gallery</h2>
              <div className="flex gap-4 overflow-x-auto">
                {m.images.slice(1).map((uri, i) => (
                  <div key={i} className="relative h-32 w-48 shrink-0">
                    <Image
                      src={uri}
                      alt={`View ${i + 2}`}
                      fill
                      className="rounded-lg object-cover"
                      sizes="192px"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
