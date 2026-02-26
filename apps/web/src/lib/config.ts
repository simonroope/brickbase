/**
 * Contract addresses and chain configuration.
 * Set via environment variables (see .env.example).
 */
export const config = {
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "11155111", 10), // Default: Sepolia
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.sepolia.org",
  assetVaultAddress: (process.env.NEXT_PUBLIC_ASSET_VAULT_ADDRESS || "") as `0x${string}`,
  assetSharesAddress: (process.env.NEXT_PUBLIC_ASSET_SHARES_ADDRESS || "") as `0x${string}`,
  oracleRouterAddress: (process.env.NEXT_PUBLIC_ORACLE_ROUTER_ADDRESS || "") as `0x${string}`,
  userAllowListAddress: (process.env.NEXT_PUBLIC_USER_ALLOWLIST_ADDRESS || "") as `0x${string}`,
  usdcAddress: (process.env.NEXT_PUBLIC_USDC_ADDRESS || "") as `0x${string}`,
} as const;
