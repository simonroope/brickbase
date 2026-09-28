import * as fs from "fs";
import * as path from "path";

export type DeployedAddresses = {
  USER_ALLOWLIST_ADDRESS: string;
  ORACLE_ROUTER_ADDRESS: string;
  ASSET_VAULT_ADDRESS: string;
  ASSET_SHARES_ADDRESS: string;
  USDC_ADDRESS: string;
};

export function deployedAddressesPath(networkName: string): string {
  return path.join(__dirname, "..", "deployments", `${networkName}-addresses.json`);
}

export function loadDeployedAddresses(networkName: string): DeployedAddresses {
  const addressesPath = deployedAddressesPath(networkName);
  if (!fs.existsSync(addressesPath)) {
    throw new Error(
      `No deployment addresses found at ${addressesPath}. Run 'npx hardhat run scripts/deploy.ts --network ${networkName}' first.`
    );
  }
  const parsed = JSON.parse(fs.readFileSync(addressesPath, "utf8")) as Partial<DeployedAddresses>;
  if (!parsed.ASSET_VAULT_ADDRESS || !parsed.ASSET_SHARES_ADDRESS) {
    throw new Error(
      `Missing ASSET_VAULT_ADDRESS or ASSET_SHARES_ADDRESS in ${addressesPath}`
    );
  }
  return {
    USER_ALLOWLIST_ADDRESS: parsed.USER_ALLOWLIST_ADDRESS ?? "",
    ORACLE_ROUTER_ADDRESS: parsed.ORACLE_ROUTER_ADDRESS ?? "",
    ASSET_VAULT_ADDRESS: parsed.ASSET_VAULT_ADDRESS,
    ASSET_SHARES_ADDRESS: parsed.ASSET_SHARES_ADDRESS,
    USDC_ADDRESS: parsed.USDC_ADDRESS ?? "",
  };
}
