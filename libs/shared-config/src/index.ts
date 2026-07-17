/// <reference types="node" />
/**
 * @brickbase/shared-config - Supported chains and RPC URL construction
 */

export const SUPPORTED_CHAIN_IDS = [1, 11155111, 8453, 84532] as const;
export type ChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

/**
 * Appends INFURA_PROJECT_ID to the base RPC URL.
 * ETHEREUM_RPC_URL is always stored as a base URL ending with '/'
 * (e.g. https://mainnet.infura.io/v3/).
 */
export function appendProjectId(baseUrl: string): string {
  const projectId = process.env.INFURA_PROJECT_ID;
  return projectId ? `${baseUrl}${projectId}` : baseUrl;
}

export function getChainConfig(chainId: number) {
  const configs: Record<number, { rpcUrl: string; name: string }> = {
    1: { rpcUrl: appendProjectId(process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com"), name: "Ethereum" },
    11155111: { rpcUrl: appendProjectId(process.env.ETHEREUM_RPC_URL || "https://rpc.sepolia.org"), name: "Sepolia" },
    8453: { rpcUrl: appendProjectId(process.env.BASE_RPC_URL || "https://mainnet.base.org"), name: "Base" },
    84532: { rpcUrl: appendProjectId(process.env.BASE_RPC_URL || "https://sepolia.base.org"), name: "Base Sepolia" },
  };
  return configs[chainId] ?? { rpcUrl: "", name: `Chain ${chainId}` };
}
