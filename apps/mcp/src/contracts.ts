/**
 * Contract read client for MCP server.
 * Uses same env vars as web app (NEXT_PUBLIC_*) for consistency.
 */
import * as dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") }); // brickbase root

import {
  createPublicClient,
  encodeFunctionData,
  defineChain,
  http,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import {
  assetVaultAbi,
  assetSharesAbi,
  oracleRouterAbi,
  assetUserAllowListAbi,
} from "../../../libs/abi/src/index.js";

const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337", 10);
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";

const localhost = defineChain({
  id: 31337,
  name: "Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

const chain =
  chainId === 31337 ? localhost : chainId === 11155111 ? sepolia : localhost;

const useMocks = process.env.MCP_USE_MOCKS === "1";

export type OraclePrices = {
  ethUsd: { price: bigint; updatedAt: bigint };
  gbpUsd: { price: bigint; updatedAt: bigint };
  goldUsd: { price: bigint; updatedAt: bigint };
  ftse100: { value: bigint; updatedAt: bigint };
};

export type AssetSummary = {
  assetId: number;
  status: number;
  capitalValue: string;
  incomeValue: string;
  metadataUri: string;
  totalSupply: string;
  availableSupply: string;
  sharePrice: string;
  tradingEnabled: boolean;
};

/** Mock data when MCP_USE_MOCKS=1 for tests without blockchain. */
const mockOraclePrices: OraclePrices = {
  ethUsd: { price: BigInt(3500e8), updatedAt: BigInt(Math.floor(Date.now() / 1000)) },
  gbpUsd: { price: BigInt(127e8), updatedAt: BigInt(Math.floor(Date.now() / 1000)) },
  goldUsd: { price: BigInt(2700e8), updatedAt: BigInt(Math.floor(Date.now() / 1000)) },
  ftse100: { value: BigInt(7500e8), updatedAt: BigInt(Math.floor(Date.now() / 1000)) },
};

const mockPropertyList: AssetSummary[] = [
  {
    assetId: 1,
    status: 2,
    capitalValue: "1000000000000000000000000",
    incomeValue: "50000000000000000000000",
    metadataUri: "ipfs://mock",
    totalSupply: "1000000000000000000000",
    availableSupply: "800000000000000000000",
    sharePrice: "1000000000000000000",
    tradingEnabled: true,
  },
];

export const config = {
  chainId,
  rpcUrl,
  assetVaultAddress: (process.env.NEXT_PUBLIC_ASSET_VAULT_ADDRESS || "") as `0x${string}`,
  assetSharesAddress: (process.env.NEXT_PUBLIC_ASSET_SHARES_ADDRESS || "") as `0x${string}`,
  oracleRouterAddress: (process.env.NEXT_PUBLIC_ORACLE_ROUTER_ADDRESS || "") as `0x${string}`,
  userAllowListAddress: (process.env.NEXT_PUBLIC_USER_ALLOWLIST_ADDRESS || "") as `0x${string}`,
  usdcAddress: (process.env.NEXT_PUBLIC_USDC_ADDRESS || "") as `0x${string}`,
};

const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

export async function getOraclePrices(): Promise<OraclePrices | null> {
  if (useMocks) return mockOraclePrices;
  if (!config.oracleRouterAddress || config.oracleRouterAddress === "0x")
    return null;
  try {
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
    return {
      ethUsd: { price: ethUsd[0], updatedAt: ethUsd[1] },
      gbpUsd: { price: gbpUsd[0], updatedAt: gbpUsd[1] },
      goldUsd: { price: goldUsd[0], updatedAt: goldUsd[1] },
      ftse100: { value: ftse100[0], updatedAt: ftse100[1] },
    };
  } catch {
    return null;
  }
}

function toDisplayUrl(u: string): string {
  if (!u || typeof u !== "string") return "";
  if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.slice(7)}`;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return u;
}

async function fetchMetadata(uri: string): Promise<Record<string, unknown> | null> {
  if (!uri || uri.startsWith("data:")) return null;
  try {
    const url = toDisplayUrl(uri);
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getAssetList(): Promise<AssetSummary[]> {
  if (useMocks) return mockPropertyList;
  if (!config.assetVaultAddress || !config.assetSharesAddress) return [];
  try {
    const logs = await publicClient.getContractEvents({
      address: config.assetVaultAddress,
      abi: assetVaultAbi,
      eventName: "AssetVaulted",
      fromBlock: "earliest",
    });
    const ids = [...new Set(logs.map((l) => Number((l as { args?: { assetId?: bigint } }).args?.assetId)).filter(Boolean))].sort((a, b) => a - b);
    if (ids.length === 0) return [];

    const vaultData = await publicClient.readContract({
      address: config.assetVaultAddress,
      abi: assetVaultAbi,
      functionName: "getAllAssets",
      args: [ids.map((assetId) => BigInt(assetId))],
    }) as { status: number; capitalValue: bigint; incomeValue: bigint; metadataURI: string }[];

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

    return ids
      .map((assetId, i) => {
        const asset = vaultData[i];
        if (!asset) return null;
        const [totalSupply, availableSupply, sharePrice, tradingEnabled] = shareInfos[i];
        return {
          assetId,
          status: asset.status,
          capitalValue: asset.capitalValue.toString(),
          incomeValue: asset.incomeValue.toString(),
          metadataUri: asset.metadataURI,
          totalSupply: totalSupply.toString(),
          availableSupply: availableSupply.toString(),
          sharePrice: sharePrice.toString(),
          tradingEnabled,
        };
      })
      .filter((a): a is AssetSummary => a != null);
  } catch {
    return [];
  }
}

export async function getAssetDetail(assetId: number): Promise<AssetSummary & { metadata?: Record<string, unknown> } | null> {
  if (useMocks) return mockPropertyList[0]?.assetId === assetId ? { ...mockPropertyList[0] } : null;
  if (!config.assetVaultAddress || !config.assetSharesAddress) return null;
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
    const metadata = asset.metadataURI ? await fetchMetadata(asset.metadataURI) : undefined;
    const [totalSupply, availableSupply, sharePrice, tradingEnabled] = shareInfo;
    return {
      assetId,
      status: asset.status,
      capitalValue: asset.capitalValue.toString(),
      incomeValue: asset.incomeValue.toString(),
      metadataUri: asset.metadataURI,
      totalSupply: totalSupply.toString(),
      availableSupply: availableSupply.toString(),
      sharePrice: sharePrice.toString(),
      tradingEnabled,
      ...(metadata != null && { metadata }),
    };
  } catch {
    return null;
  }
}

export async function getUserShareBalance(userAddress: Address, assetId: number): Promise<string> {
  if (!config.assetSharesAddress) return "0";
  try {
    const result = (await publicClient.readContract({
      address: config.assetSharesAddress,
      abi: assetSharesAbi,
      functionName: "getUserShares",
      args: [userAddress, BigInt(assetId)],
    })) as [bigint, bigint, bigint, boolean, bigint, bigint, bigint, bigint];
    return result[4].toString();
  } catch {
    return "0";
  }
}

export async function isUserWhitelisted(userAddress: Address): Promise<boolean> {
  if (!config.assetVaultAddress) return false;
  try {
    return (await publicClient.readContract({
      address: config.assetVaultAddress,
      abi: assetVaultAbi,
      functionName: "isUserAllowed",
      args: [userAddress],
    })) as boolean;
  } catch {
    return false;
  }
}

export async function getWhitelistedUsers(): Promise<string[]> {
  if (!config.userAllowListAddress || config.userAllowListAddress === "0x")
    return [];
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
      if (args?.user) state.set(args.user, args.allowed ?? false);
    }
    return [...state.entries()]
      .filter(([, allowed]) => allowed)
      .map(([addr]) => addr)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  } catch {
    return [];
  }
}

const erc20ApproveAbi = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export type PurchaseTransactionPayload = {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  step: string;
};

/**
 * Prepares unsigned transactions for share purchase.
 * The agent signs and submits these with its own private key.
 * Returns: approve (USDC) then purchaseAssetShares, in order.
 */
export async function preparePurchaseTransactions(
  assetId: number,
  amountRaw: bigint
): Promise<
  | { success: true; chainId: number; rpcUrl: string; transactions: PurchaseTransactionPayload[]; sharePrice: string }
  | { success: false; error: string }
> {
  if (!config.usdcAddress || !config.assetSharesAddress) {
    return { success: false, error: "Contract addresses not configured" };
  }

  try {
    const [, , sharePrice] = (await publicClient.readContract({
      address: config.assetSharesAddress,
      abi: assetSharesAbi as never[],
      functionName: "getAssetShares",
      args: [BigInt(assetId)],
    })) as [bigint, bigint, bigint, boolean];

    const totalCostUsdc = (amountRaw * sharePrice) / BigInt(1e18);

    const approveData = encodeFunctionData({
      abi: erc20ApproveAbi,
      functionName: "approve",
      args: [config.assetSharesAddress, totalCostUsdc],
    });

    const purchaseData = encodeFunctionData({
      abi: assetSharesAbi,
      functionName: "purchaseAssetShares",
      args: [BigInt(assetId), amountRaw],
    });

    return {
      success: true,
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      sharePrice: sharePrice.toString(),
      transactions: [
        { step: "approve_usdc", to: config.usdcAddress, data: approveData, value: BigInt(0) },
        { step: "purchase_asset_shares", to: config.assetSharesAddress, data: purchaseData, value: BigInt(0) },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
