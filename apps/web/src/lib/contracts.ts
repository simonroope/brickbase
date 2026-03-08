import { createPublicClient, defineChain, http, type Address } from "viem";
import { sepolia } from "viem/chains";
import { config } from "./config";
import { mockAssets } from "@tests/mocks/mockAssets";

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

export async function fetchOraclePrices(): Promise<OraclePrices> {
  if (!config.oracleRouterAddress || config.oracleRouterAddress === "0x") {
    throw new Error("Oracle router address not configured");
  }
  const [ethUsd, gbpUsd, goldUsd, ftse100] = await Promise.all([
    publicClient.readContract({
      address: config.oracleRouterAddress,
      abi: oracleRouterAbi as never[],
      functionName: "getEthUsdPrice",
    }) as Promise<[bigint, bigint]>,
    publicClient.readContract({
      address: config.oracleRouterAddress,
      abi: oracleRouterAbi as never[],
      functionName: "getGbpUsdPrice",
    }) as Promise<[bigint, bigint]>,
    publicClient.readContract({
      address: config.oracleRouterAddress,
      abi: oracleRouterAbi as never[],
      functionName: "getGoldUsdPrice",
    }) as Promise<[bigint, bigint]>,
    publicClient.readContract({
      address: config.oracleRouterAddress,
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

function toDisplayUrl(u: string): string {
  if (!u || typeof u !== "string") return "";
  if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.slice(7)}`;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafy[a-zA-Z0-9]+)/.test(u.trim())) {
    return `https://ipfs.io/ipfs/${u.trim()}`;
  }
  return u;
}

async function fetchMetadata(metadataUri: string): Promise<AssetMetadata | null> {
  if (!metadataUri || metadataUri.startsWith("data:")) return null;
  try {
    const url = toDisplayUrl(metadataUri);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
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
    const rawImages: string[] = Array.isArray(json.images)
      ? json.images
          .map((x) => (typeof x === "string" ? x : (x as { url?: string }).url))
          .filter((x): x is string => typeof x === "string")
      : [];
    const images = rawImages.map(toDisplayUrl).filter(Boolean);
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
      documents: Array.isArray(json.documents)
        ? (json.documents as string[]).filter((x): x is string => typeof x === "string")
        : undefined,
    };
  } catch (e) {
    console.warn("[fetchMetadata]", metadataUri, e);
    return null;
  }
}

async function fetchAssetIdsFromEvents(): Promise<number[]> {
  if (!config.assetVaultAddress) return [];
  try {
    const logs = await publicClient.getContractEvents({
      address: config.assetVaultAddress,
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

/** Fetch assets from blockchain, or mock when contracts not configured. */
export async function fetchAssets(): Promise<AssetSummary[]> {
  if (!config.assetVaultAddress || !config.assetSharesAddress) return mockAssets;
  try {
    const ids = await fetchAssetIdsFromEvents();
    if (ids.length === 0) return mockAssets;
    const vaultData = (await publicClient.readContract({
      address: config.assetVaultAddress,
      abi: assetVaultAbi,
      functionName: "getAllAssets",
      args: [ids.map((assetId) => BigInt(assetId))],
    })) as { status: number; capitalValue: bigint; incomeValue: bigint; metadataURI: string }[];
    const shareInfos = await Promise.all(
      ids.map((assetId) =>
        publicClient.readContract({
          address: config.assetSharesAddress,
          abi: assetSharesAbi as never[],
          functionName: "getAssetShares",
          args: [BigInt(assetId)],
        }) as Promise<[bigint, bigint, bigint, boolean]>
      )
    );
    const results: AssetSummary[] = [];
    for (let i = 0; i < ids.length; i++) {
      const asset = vaultData[i];
      if (!asset) continue;
      const [totalSupply, availableSupply, sharePrice, tradingEnabled] = shareInfos[i];
      const metadata = asset.metadataURI ? await fetchMetadata(asset.metadataURI) : null;
      results.push(
        mergeAssetWithShareInfo(
          ids[i],
          asset,
          [totalSupply, availableSupply, sharePrice, tradingEnabled],
          metadata
        )
      );
    }
    return results;
  } catch {
    return mockAssets;
  }
}

export async function fetchAssetDetail(assetId: number) {
  if (!config.assetVaultAddress || !config.assetSharesAddress) {
    const asset = mockAssets.find((a) => a.assetId === assetId);
    return asset ? { ...asset, exists: true } : null;
  }
  try {
    const [assets, shareInfo] = await Promise.all([
      publicClient.readContract({
        address: config.assetVaultAddress,
        abi: assetVaultAbi as never[],
        functionName: "getAllAssets",
        args: [[BigInt(assetId)]],
      }) as Promise<{ status: number; capitalValue: bigint; incomeValue: bigint; metadataURI: string }[]>,
      publicClient.readContract({
        address: config.assetSharesAddress,
        abi: assetSharesAbi as never[],
        functionName: "getAssetShares",
        args: [BigInt(assetId)],
      }) as Promise<[bigint, bigint, bigint, boolean]>,
    ]);
    const asset = assets[0];
    if (!asset) return null;
    const metadata = asset.metadataURI ? await fetchMetadata(asset.metadataURI) : null;
    const [totalSupply, availableSupply, sharePrice, tradingEnabled] = shareInfo;
    const summary = mergeAssetWithShareInfo(
      assetId,
      asset,
      [totalSupply, availableSupply, sharePrice, tradingEnabled],
      metadata
    );
    return { ...summary, exists: true };
  } catch {
    const asset = mockAssets.find((a) => a.assetId === assetId);
    return asset ? { ...asset, exists: true } : null;
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

export async function isUserWhitelisted(userAddress: Address): Promise<boolean> {
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
 * Fetch current whitelisted users by replaying UserAllowlistUpdated events.
 * Returns addresses that are currently allowed (most recent event per user is honoured).
 */
export async function fetchWhitelistedUsers(): Promise<Address[]> {
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
