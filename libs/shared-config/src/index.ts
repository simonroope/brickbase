/// <reference types="node" />
/**
 * @brickbase/shared-config - Chain config, deployed addresses, env
 */

export const SUPPORTED_CHAIN_IDS = [1, 11155111, 8453, 84532] as const;
export type ChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export function getChainConfig(chainId: number) {
  const configs: Record<number, { rpcUrl: string; name: string }> = {
    1: { rpcUrl: process.env.ETH_MAINNET_RPC_URL || "https://eth.llamarpc.com", name: "Ethereum" },
    11155111: { rpcUrl: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org", name: "Sepolia" },
    8453: { rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org", name: "Base" },
    84532: { rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org", name: "Base Sepolia" },
  };
  return configs[chainId] ?? { rpcUrl: "", name: `Chain ${chainId}` };
}
