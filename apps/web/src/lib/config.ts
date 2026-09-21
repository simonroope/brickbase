/**
 * Contract addresses and chain configuration.
 * Set via environment variables (see .env.example).
 * Values are baked into the browser bundle by next.config.ts `env` block.
 */
import { getChainConfig } from "@brickbase/chains";

const chainId = parseInt(process.env.CHAIN_ID || "11155111", 10);
const chainConfig = getChainConfig(chainId);

export const config = {
  chainId,
  rpcUrl: process.env.ETHEREUM_RPC_URL || chainConfig.rpcUrl,
  assetVaultAddress: (process.env.ASSET_VAULT_ADDRESS || "") as `0x${string}`,
  assetSharesAddress: (process.env.ASSET_SHARES_ADDRESS || "") as `0x${string}`,
  oracleRouterAddress: (process.env.ORACLE_ROUTER_ADDRESS || "") as `0x${string}`,
  userAllowListAddress: (process.env.USER_ALLOWLIST_ADDRESS || "") as `0x${string}`,
  usdcAddress: (process.env.USDC_ADDRESS || "") as `0x${string}`,
} as const;
