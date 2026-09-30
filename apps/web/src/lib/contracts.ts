import { createPublicClient, defineChain, http, type Address } from "viem";
import { sepolia } from "viem/chains";
import { toIpfsGatewayUrl } from "@brickbase/chains";
import { config } from "./config";
import { mockAssets } from "@tests/mocks/mockAssets";
import { resolveAssetIds, isRecordedAsset } from "./assetIds";

const localhost = defineChain({
  id: 31337,
  name: "Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});
import {
  assetVaultAbi,
  assetSharesAbi,
  oracleRouterAbi,
  assetUserAllowListAbi,
} from "@brickbase/abi";

const chain = config.chainId === 31337 ? localhost : config.chainId === 11155111 ? sepolia : undefined;

export const publicClient = createPublicClient({
  chain: chain ?? sepolia,
  transport: http(config.rpcUrl),
});

export type OraclePrices = {
  ethUsd: { price: bigint; updatedAt: bigint };
  gbpUsd: { price: bigint; updatedAt: bigint };
  goldUsd: { price: bigint; updatedAt: bigint };
  ftse100: { value: bigint; updatedAt: bigint };
};

export type OraclePricesJson = {
  ethUsd: { price: string; updatedAt: string };
  gbpUsd: { price: string; updatedAt: string };
  goldUsd: { price: string; updatedAt: string };
  ftse100: { value: string; updatedAt: string };
};

export function serializeOraclePrices(prices: OraclePrices): OraclePricesJson {
  return {
    ethUsd: {
      price: prices.ethUsd.price.toString(),
      updatedAt: prices.ethUsd.updatedAt.toString(),
    },
    gbpUsd: {
      price: prices.gbpUsd.price.toString(),
      updatedAt: prices.gbpUsd.updatedAt.toString(),
    },
    goldUsd: {
      price: prices.goldUsd.price.toString(),
      updatedAt: prices.goldUsd.updatedAt.toString(),
    },
    ftse100: {
      value: prices.ftse100.value.toString(),
      updatedAt: prices.ftse100.updatedAt.toString(),
    },
  };
}

export function deserializeOraclePrices(json: OraclePricesJson): OraclePrices {
  return {
    ethUsd: { price: BigInt(json.ethUsd.price), updatedAt: BigInt(json.ethUsd.updatedAt) },
    gbpUsd: { price: BigInt(json.gbpUsd.price), updatedAt: BigInt(json.gbpUsd.updatedAt) },
    goldUsd: { price: BigInt(json.goldUsd.price), updatedAt: BigInt(json.goldUsd.updatedAt) },
    ftse100: { value: BigInt(json.ftse100.value), updatedAt: BigInt(json.ftse100.updatedAt) },
  };
}

/** Browser entry: Next.js API (server publicClient). Does not use a wallet. */
export async function loadOraclePrices(): Promise<OraclePrices> {
  const res = await fetch("/api/oracle-prices");
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Oracle prices unavailable");
  }
  return deserializeOraclePrices((await res.json()) as OraclePricesJson);
}

export async function fetchOraclePrices(
  oracleRouterAddress: string = config.oracleRouterAddress
): Promise<OraclePrices> {
  if (!oracleRouterAddress || oracleRouterAddress === "0x") {
    throw new Error("Oracle router address not configured");
  }
  const router = oracleRouterAddress as Address;
  const [ethUsd, gbpUsd, goldUsd, ftse100] = await Promise.all([
    publicClient.readContract({
      address: router,
      abi: oracleRouterAbi as never[],
      functionName: "getEthUsdPrice",
    }) as Promise<[bigint, bigint]>,
    publicClient.readContract({
      address: router,
      abi: oracleRouterAbi as never[],
      functionName: "getGbpUsdPrice",
    }) as Promise<[bigint, bigint]>,
    publicClient.readContract({
      address: router,
      abi: oracleRouterAbi as never[],
      functionName: "getGoldUsdPrice",
    }) as Promise<[bigint, bigint]>,
    publicClient.readContract({
      address: router,
      abi: oracleRouterAbi as never[],
      functionName: "getFtse100Value",
    }) as Promise<[bigint, bigint]>,
  ]);
  return { ethUsd: { price: ethUsd[0], updatedAt: ethUsd[1] }, gbpUsd: { price: gbpUsd[0], updatedAt: gbpUsd[1] }, goldUsd: { price: goldUsd[0], updatedAt: goldUsd[1] }, ftse100: { value: ftse100[0], updatedAt: ftse100[1] } };
}

/** Metadata from the JSON at metadataUri. */
export type AssetMetadata = {
  assetType?: string;
  name?: string;
  address?: string;
  location?: string;
  purchasePrice?: bigint;
  purchaseDate?: string;
  area?: number;
  yearBuilt?: number;
  jurisdiction?: string;
  images: string[];
  documents?: string[];
};

export type AssetSummary = {
  assetId: number;
  status: number;
  capitalValue: bigint;
  incomeValue: bigint;
  metadataUri: string;
  metadata: AssetMetadata | null;
  totalSupply: bigint;
  availableSupply: bigint;
  sharePrice: bigint;
  tradingEnabled: boolean;
};

export type AssetDetail = AssetSummary & { exists: boolean };

export type AssetMetadataJson = Omit<AssetMetadata, "purchasePrice"> & {
  purchasePrice?: string;
};

export type AssetSummaryJson = {
  assetId: number;
  status: number;
  capitalValue: string;
  incomeValue: string;
  metadataUri: string;
  metadata: AssetMetadataJson | null;
  totalSupply: string;
  availableSupply: string;
  sharePrice: string;
  tradingEnabled: boolean;
};

export type AssetDetailJson = AssetSummaryJson & { exists: boolean };

function serializeMetadata(metadata: AssetMetadata | null): AssetMetadataJson | null {
  if (!metadata) return null;
  return {
    ...metadata,
    purchasePrice: metadata.purchasePrice?.toString(),
  };
}

function deserializeMetadata(metadata: AssetMetadataJson | null): AssetMetadata | null {
  if (!metadata) return null;
  return {
    ...metadata,
    images: metadata.images ?? [],
    purchasePrice: metadata.purchasePrice != null ? BigInt(metadata.purchasePrice) : undefined,
  };
}

export function serializeAssetSummary(asset: AssetSummary): AssetSummaryJson {
  return {
    assetId: asset.assetId,
    status: asset.status,
    capitalValue: asset.capitalValue.toString(),
    incomeValue: asset.incomeValue.toString(),
    metadataUri: asset.metadataUri,
    metadata: serializeMetadata(asset.metadata),
    totalSupply: asset.totalSupply.toString(),
    availableSupply: asset.availableSupply.toString(),
    sharePrice: asset.sharePrice.toString(),
    tradingEnabled: asset.tradingEnabled,
  };
}

export function deserializeAssetSummary(json: AssetSummaryJson): AssetSummary {
  return {
    assetId: json.assetId,
    status: json.status,
    capitalValue: BigInt(json.capitalValue),
    incomeValue: BigInt(json.incomeValue),
    metadataUri: json.metadataUri,
    metadata: deserializeMetadata(json.metadata),
    totalSupply: BigInt(json.totalSupply),
    availableSupply: BigInt(json.availableSupply),
    sharePrice: BigInt(json.sharePrice),
    tradingEnabled: json.tradingEnabled,
  };
}

export function serializeAssetDetail(asset: AssetDetail): AssetDetailJson {
  return { ...serializeAssetSummary(asset), exists: asset.exists };
}

export function deserializeAssetDetail(json: AssetDetailJson): AssetDetail {
  return { ...deserializeAssetSummary(json), exists: json.exists };
}

/** Browser entry: Next.js API (server publicClient). Does not use a wallet. */
export async function loadAssetDetail(assetId: number): Promise<AssetDetail | null> {
  const res = await fetch(`/api/assets/${assetId}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Asset unavailable");
  }
  return deserializeAssetDetail((await res.json()) as AssetDetailJson);
}

function vaultAndShares(vaultAddress: string, sharesAddress: string): { vault: Address; shares: Address } | null {
  if (!vaultAddress || !sharesAddress) return null;
  return { vault: vaultAddress as Address, shares: sharesAddress as Address };
}

function stringUrls(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((x) => (typeof x === "string" ? x : (x as { url?: string }).url))
    .filter((x): x is string => typeof x === "string")
    .map(toIpfsGatewayUrl)
    .filter(Boolean);
}

async function fetchMetadata(metadataUri: string): Promise<AssetMetadata | null> {
  if (!metadataUri || metadataUri.startsWith("data:")) return null;
  try {
    const url = toIpfsGatewayUrl(metadataUri);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    // CID-addressed IPFS JSON is immutable; Next Data Cache keys by gateway URL.
    const res = await fetch(url, { cache: "force-cache", signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[fetchMetadata] ${res.status} ${url}`);
      return null;
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) {
      console.warn(`[fetchMetadata] non-JSON content-type: ${ct} for ${url}`);
      return null;
    }
    const text = await res.text();
    const json = JSON.parse(text) as Record<string, unknown>;
    const images = stringUrls(json.images);
    const purchasePrice =
      json.purchasePrice != null
        ? typeof json.purchasePrice === "string"
          ? BigInt(json.purchasePrice)
          : BigInt(Math.floor(Number(json.purchasePrice))) * (BigInt(10) ** BigInt(18))
        : undefined;
    return {
      assetType: json.assetType as string | undefined,
      name: json.name as string | undefined,
      address: json.address as string | undefined,
      location: json.location as string | undefined,
      purchasePrice,
      purchaseDate: json.purchaseDate as string | undefined,
      area: typeof json.area === "number" ? json.area : undefined,
      yearBuilt: typeof json.yearBuilt === "number" ? json.yearBuilt : undefined,
      jurisdiction: json.jurisdiction as string | undefined,
      images,
      documents: Array.isArray(json.documents) ? stringUrls(json.documents) : undefined,
    };
  } catch (e) {
    console.warn("[fetchMetadata]", metadataUri, e);
    return null;
  }
}

async function fetchAssetIdsFromEvents(vault: Address): Promise<number[]> {
  try {
    const logs = await publicClient.getContractEvents({
      address: vault,
      abi: assetVaultAbi,
      eventName: "AssetVaulted",
      fromBlock: "earliest",
    });
    const ids = new Set<number>();
    for (const log of logs) {
      const args = (log as { args?: { assetId?: bigint } }).args;
      if (args?.assetId != null) ids.add(Number(args.assetId));
    }
    return [...ids].sort((a, b) => a - b);
  } catch {
    return [];
  }
}

type VaultAsset = {
  status: number;
  capitalValue: bigint;
  incomeValue: bigint;
  metadataURI: string;
  createdAt: bigint;
  updatedAt: bigint;
};

async function readVaultAsset(vault: Address, assetId: number): Promise<VaultAsset> {
  return publicClient.readContract({
    address: vault,
    abi: assetVaultAbi,
    functionName: "getAsset",
    args: [BigInt(assetId)],
  }) as Promise<VaultAsset>;
}

async function loadSummaries(vault: Address, shares: Address, ids: number[]): Promise<AssetSummary[]> {
  if (ids.length === 0) return [];
  const vaultData = (await publicClient.readContract({
    address: vault,
    abi: assetVaultAbi,
    functionName: "getAllAssets",
    args: [ids.map((assetId) => BigInt(assetId))],
  })) as VaultAsset[];
  const shareInfos = await Promise.all(
    ids.map(
      (assetId) =>
        publicClient.readContract({
          address: shares,
          abi: assetSharesAbi as never[],
          functionName: "getAssetShares",
          args: [BigInt(assetId)],
        }) as Promise<[bigint, bigint, bigint, boolean]>
    )
  );
  const results: AssetSummary[] = [];
  for (let i = 0; i < ids.length; i++) {
    const asset = vaultData[i];
    const shareInfo = shareInfos[i];
    if (!asset || !shareInfo || !isRecordedAsset(asset)) continue;
    const metadata = asset.metadataURI ? await fetchMetadata(asset.metadataURI) : null;
    results.push(mergeAssetWithShareInfo(ids[i], asset, shareInfo, metadata));
  }
  return results;
}

function mergeAssetWithShareInfo(
  assetId: number,
  asset: { status: number; capitalValue: bigint; incomeValue: bigint; metadataURI: string },
  shareInfo: [bigint, bigint, bigint, boolean],
  metadata: AssetMetadata | null
): AssetSummary {
  return {
    assetId,
    status: asset.status,
    capitalValue: asset.capitalValue,
    incomeValue: asset.incomeValue,
    metadataUri: asset.metadataURI,
    metadata,
    totalSupply: shareInfo[0],
    availableSupply: shareInfo[1],
    sharePrice: shareInfo[2],
    tradingEnabled: shareInfo[3],
  };
}

/** On-chain assets via public RPC. Mocks only when vault/shares addresses are unset. */
export async function fetchAssets(
  vaultAddress: string = config.assetVaultAddress,
  sharesAddress: string = config.assetSharesAddress
): Promise<AssetSummary[]> {
  const addresses = vaultAndShares(vaultAddress, sharesAddress);
  if (!addresses) return mockAssets;
  try {
    const eventIds = await fetchAssetIdsFromEvents(addresses.vault);
    const ids = await resolveAssetIds(eventIds, (id) => readVaultAsset(addresses.vault, id));
    return loadSummaries(addresses.vault, addresses.shares, ids);
  } catch {
    return [];
  }
}

export async function fetchAssetDetail(
  assetId: number,
  vaultAddress: string = config.assetVaultAddress,
  sharesAddress: string = config.assetSharesAddress
): Promise<AssetDetail | null> {
  const addresses = vaultAndShares(vaultAddress, sharesAddress);
  if (!addresses) {
    const asset = mockAssets.find((a) => a.assetId === assetId);
    return asset ? { ...asset, exists: true } : null;
  }
  try {
    const summaries = await loadSummaries(addresses.vault, addresses.shares, [assetId]);
    const summary = summaries[0];
    if (!summary) return null;
    return { ...summary, exists: true };
  } catch {
    return null;
  }
}

/** getUserShares returns [totalSupply, availableSupply, sharePrice, tradingEnabled, balance, frozen, unfrozen, recordedPurchasePrice] */
export async function getUserShareBalance(userAddress: Address, assetId: number): Promise<bigint> {
  if (!config.assetSharesAddress) return BigInt(0);
  try {
    const result = (await publicClient.readContract({
      address: config.assetSharesAddress,
      abi: assetSharesAbi,
      functionName: "getUserShares",
      args: [userAddress, BigInt(assetId)],
    })) as [bigint, bigint, bigint, boolean, bigint, bigint, bigint, bigint];
    return result[4]; // balance_
  } catch {
    return BigInt(0);
  }
}

export async function isUserAllowlisted(userAddress: Address): Promise<boolean> {
  if (!config.assetVaultAddress) return false;
  try {
    return await publicClient.readContract({
      address: config.assetVaultAddress,
      abi: assetVaultAbi,
      functionName: "isUserAllowed",
      args: [userAddress],
    }) as boolean;
  } catch {
    return false;
  }
}

/**
 * Fetch current allowlisted users by replaying UserAllowlistUpdated events.
 * Returns addresses that are currently allowed (most recent event per user is honoured).
 */
export async function fetchAllowlistedUsers(): Promise<Address[]> {
  if (!config.userAllowListAddress || config.userAllowListAddress === "0x") return [];
  try {
    const logs = await publicClient.getContractEvents({
      address: config.userAllowListAddress,
      abi: assetUserAllowListAbi,
      eventName: "UserAllowlistUpdated",
      fromBlock: "earliest",
    });
    const state = new Map<Address, boolean>();
    for (const log of logs) {
      const args = (log as { args?: { user?: Address; allowed?: boolean } }).args;
      if (args?.user) {
        state.set(args.user, args.allowed ?? false);
      }
    }
    return [...state.entries()]
      .filter(([, allowed]) => allowed)
      .map(([addr]) => addr)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return [];
  }
}
