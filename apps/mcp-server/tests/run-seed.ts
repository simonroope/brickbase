/**
 * Seed runner - invoked via npx tsx to avoid Playwright ESM loader issues.
 */
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
dotenv.config({ path: resolve(root, ".env") });

import { seedUsersAndAssets } from "../../../libs/test-seed/src/index.js";
import type { Address } from "viem";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545";
const assetVault = process.env.NEXT_PUBLIC_ASSET_VAULT_ADDRESS! as Address;
const assetShares = process.env.NEXT_PUBLIC_ASSET_SHARES_ADDRESS! as Address;
const usdc = process.env.NEXT_PUBLIC_USDC_ADDRESS! as Address;

await seedUsersAndAssets({ rpcUrl, assetVault, assetShares, usdc });
