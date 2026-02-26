/**
 * @brickbase/abi - Shared contract ABIs for Brickbase monorepo
 */

import type { Abi } from "viem";
import AssetVaultArtifact from "./generated/AssetVault.json";
import AssetSharesArtifact from "./generated/AssetShares.json";
import OracleRouterArtifact from "./generated/OracleRouter.json";
import AssetUserAllowListArtifact from "./generated/AssetUserAllowList.json";

export const assetVaultAbi = (AssetVaultArtifact as { abi: unknown }).abi as Abi;
export const assetSharesAbi = (AssetSharesArtifact as { abi: unknown }).abi as Abi;
export const oracleRouterAbi = (OracleRouterArtifact as { abi: unknown }).abi as Abi;
export const assetUserAllowListAbi = (AssetUserAllowListArtifact as { abi: unknown }).abi as Abi;
