/// <reference types="node" />
/**
 * @brickbase/chains - Supported chains and RPC URL construction
 */

export const SUPPORTED_CHAIN_IDS = [1, 11155111, 8453, 84532] as const;
export type ChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export { toIpfsGatewayUrl, ipfsCidPath, ipfsGatewayUrls, createIpfsJsonFetcher } from "./ipfsUrl";

/**
 * Appends INFURA_PROJECT_ID to an Infura-style base RPC URL (ending with `/`).
 * Loopback URLs and public RPCs without a trailing slash are returned unchanged.
 */
export function appendProjectId(baseUrl: string): string {
  const projectId = process.env.INFURA_PROJECT_ID;
  if (
    !projectId ||
    !baseUrl.endsWith("/") ||
    /localhost|127\.0\.0\.1/.test(baseUrl)
  ) {
    return baseUrl;
  }
  return `${baseUrl}${projectId}`;
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
