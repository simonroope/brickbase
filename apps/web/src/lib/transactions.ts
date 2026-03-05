import { createPublicClient, defineChain, http, type Address, type Chain } from "viem";
import { getWalletClient } from "@wagmi/core";
import { mainnet, sepolia, base, baseSepolia } from "viem/chains";
import { getWagmiConfig } from "@/config/wagmi";
import { config } from "./config";
import { assetSharesAbi, assetVaultAbi } from "@brickbase/abi";

const localhost = defineChain({
  id: 31337,
  name: "Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

const chainMap: Record<number, Chain> = {
  1: mainnet,
  31337: localhost,
  11155111: sepolia,
  8453: base,
  84532: baseSepolia,
};
const chain = chainMap[config.chainId] ?? sepolia;

const publicClient = createPublicClient({
  chain,
  transport: http(config.rpcUrl),
});

const erc20Abi = [
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

/**
 * Approve USDC for AssetShares contract and then purchase shares.
 */
export async function purchaseShares(
  _userAddress: Address,
  assetId: number,
  amount: bigint,
  sharePrice: bigint
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined") {
    return { success: false, error: "No wallet found" };
  }
  if (!config.usdcAddress || !config.assetSharesAddress) {
    return { success: false, error: "Contract addresses not configured" };
  }

  const walletClient = await getWalletClient(getWagmiConfig());
  if (!walletClient) return { success: false, error: "No wallet connected" };

  const account = walletClient.account ?? (await walletClient.getAddresses())?.[0];
  if (!account) return { success: false, error: "Could not get wallet account" };

  // Total cost: amount * sharePrice / 10^18 (shares are 18 decimals, USDC is 6)
  const totalCostUsdc = (amount * sharePrice) / BigInt(1e18);
  // USDC has 6 decimals
  const totalCost = totalCostUsdc;

  try {
    // 1. Approve USDC
    const approveHash = await walletClient.writeContract({
      address: config.usdcAddress,
      abi: erc20Abi,
      functionName: "approve",
      args: [config.assetSharesAddress, totalCost],
      account,
    });
    if (!approveHash) return { success: false, error: "Approve failed" };
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    // 2. Purchase shares
    const purchaseHash = await walletClient.writeContract({
      address: config.assetSharesAddress,
      abi: assetSharesAbi,
      functionName: "purchaseAssetShares",
      args: [BigInt(assetId), amount],
      account,
    });
    if (!purchaseHash) return { success: false, error: "Purchase failed" };
    await publicClient.waitForTransactionReceipt({ hash: purchaseHash });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Add user to whitelist (requires COMPLIANCE_OFFICER_ROLE).
 */
export async function setUserAllowed(
  userAddress: Address,
  allowed: boolean
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === "undefined") {
    return { success: false, error: "No wallet found" };
  }
  if (!config.assetVaultAddress) {
    return { success: false, error: "Contract addresses not configured" };
  }

  const walletClient = await getWalletClient(getWagmiConfig());
  if (!walletClient) return { success: false, error: "No wallet connected" };

  const account = walletClient.account ?? (await walletClient.getAddresses())?.[0];
  if (!account) return { success: false, error: "Could not get wallet account" };

  try {
    const hash = await walletClient.writeContract({
      address: config.assetVaultAddress,
      abi: assetVaultAbi,
      functionName: "setUserAllowed",
      args: [userAddress, allowed],
      account,
    });
    if (!hash) return { success: false, error: "Transaction failed" };
    await publicClient.waitForTransactionReceipt({ hash });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
