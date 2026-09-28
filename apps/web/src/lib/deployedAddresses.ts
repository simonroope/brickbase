import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const DEPLOYED_ADDRESS_KEYS = [
  "USER_ALLOWLIST_ADDRESS",
  "ORACLE_ROUTER_ADDRESS",
  "ASSET_VAULT_ADDRESS",
  "ASSET_SHARES_ADDRESS",
  "USDC_ADDRESS",
] as const;

export type DeployedAddressKey = (typeof DEPLOYED_ADDRESS_KEYS)[number];

const NETWORK_BY_CHAIN_ID: Record<number, string> = {
  1: "mainnet",
  11155111: "sepolia",
  8453: "base",
  84532: "baseSepolia",
  31337: "localhost",
};

function deploymentsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "contracts/deployments"),
    path.resolve(process.cwd(), "../../contracts/deployments"),
  ];
  return candidates.find((dir) => existsSync(dir)) ?? candidates[1];
}

/** Env var if set; otherwise `{network}-addresses.json` for `CHAIN_ID`. */
export function resolveDeployedAddress(key: DeployedAddressKey): string {
  const fromEnv = process.env[key]?.trim();
  if (fromEnv) return fromEnv;
  const chainId = parseInt(process.env.CHAIN_ID || "31337", 10);
  const network = NETWORK_BY_CHAIN_ID[chainId];
  if (!network) return "";
  const file = path.join(deploymentsDir(), `${network}-addresses.json`);
  if (!existsSync(file)) return "";
  const parsed = JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
  return parsed[key] ?? "";
}
