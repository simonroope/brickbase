import hre, { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

type DeployConfig = {
  network: string;
  usdc: string;
  chainlink: {
    ethUsd: string;
    usdGbp: string;
    goldUsd: string;
    ftse100: string;
  };
  admins: {
    defaultAdmin: string;
    assetManager: string;
    complianceOfficer: string;
  };
};

function emptyDeployConfig(networkName: string): DeployConfig {
  return {
    network: networkName,
    usdc: "",
    chainlink: { ethUsd: "", usdGbp: "", goldUsd: "", ftse100: "" },
    admins: { defaultAdmin: "", assetManager: "", complianceOfficer: "" },
  };
}

function loadConfig(networkName: string): DeployConfig {
  // Env vars take precedence over the JSON file — set them in CI to avoid
  // committing sensitive addresses. All DEPLOY_* vars are optional; any
  // field not overridden falls back to the JSON file value.
  const configPath = path.join(__dirname, "../..", "deployments", `${networkName}.json`);
  const empty = emptyDeployConfig(networkName);

  let parsed: Partial<DeployConfig> & { ASSET_VAULT_ADDRESS?: string } = {};
  if (fs.existsSync(configPath)) {
    parsed = JSON.parse(fs.readFileSync(configPath, "utf8")) as typeof parsed;
  }

  if (parsed.ASSET_VAULT_ADDRESS && !parsed.chainlink) {
    throw new Error(
      `${configPath} contains deployed contract addresses, not deploy inputs. ` +
        `Use keys network, usdc, chainlink, admins (see deployments/localhost.json). ` +
        `Write deployed addresses to deployments/${networkName}-addresses.json.`
    );
  }

  const base: DeployConfig = {
    network: networkName,
    usdc: parsed.usdc ?? empty.usdc,
    chainlink: { ...empty.chainlink, ...parsed.chainlink },
    admins: { ...empty.admins, ...parsed.admins },
  };

  return {
    network: networkName,
    usdc: process.env.USDC_ADDRESS || base.usdc,
    chainlink: {
      ethUsd: process.env.CHAINLINK_ETH_USD_ADDRESS || base.chainlink.ethUsd,
      usdGbp: process.env.CHAINLINK_USD_GBP_ADDRESS || base.chainlink.usdGbp,
      goldUsd: process.env.CHAINLINK_XAU_USD_ADDRESS || base.chainlink.goldUsd,
      ftse100: process.env.CHAINLINK_FTSE100_ADDRESS || base.chainlink.ftse100,
    },
    admins: {
      defaultAdmin: process.env.ADMIN_ADDRESS || base.admins.defaultAdmin,
      assetManager: process.env.ADMIN_ASSET_MANAGER_ADDRESS || base.admins.assetManager,
      complianceOfficer:
        process.env.ADMIN_COMPLIANCE_ADDRESS || base.admins.complianceOfficer,
    },
  };
}

async function main() {
  const networkName = hre.network.name;
  const deployConfig = loadConfig(networkName);

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      `No deployer account for network "${networkName}". Set PRIVATE_KEY in the repo-root .env to a funded ${networkName} account.`
    );
  }
  console.log(`Deploying with ${deployer.address} to network ${networkName}`);

  // Validate addresses are valid hex addresses (not ENS names or empty)
  const validateAddress = (address: string, name: string) => {
    if (!address || address === "") {
      throw new Error(`${name} address is required in deploy config`);
    }
    if (!ethers.isAddress(address)) {
      throw new Error(`${name} address "${address}" is not a valid address`);
    }
    return address;
  };

  const isLocalNetwork = networkName === "localhost" || networkName === "hardhat";
  const allowMockFeeds =
    isLocalNetwork || networkName === "sepolia" || networkName === "baseSepolia";

  async function resolveFeed(
    configured: string,
    name: string,
    mockAnswer: bigint
  ): Promise<string> {
    if (configured) {
      return validateAddress(configured, name);
    }
    if (!allowMockFeeds) {
      throw new Error(`${name} address is required in deploy config`);
    }
    console.log(`Deploying mock ${name} (${networkName} has no configured feed)...`);
    const MockAggFactory = await ethers.getContractFactory("MockChainlinkAggregator");
    const mock = await MockAggFactory.deploy(mockAnswer, 8);
    await mock.waitForDeployment();
    const address = mock.target as string;
    console.log(`  ${name}: ${address}`);
    return address;
  }

  const ethUsdFeed = await resolveFeed(
    deployConfig.chainlink.ethUsd,
    "ETH/USD feed",
    ethers.parseUnits("2010", 8)
  );
  const usdGbpFeed = await resolveFeed(
    deployConfig.chainlink.usdGbp,
    "USD/GBP feed",
    ethers.parseUnits("0.8", 8)
  );
  const goldUsdFeed = await resolveFeed(
    deployConfig.chainlink.goldUsd,
    "Gold/USD feed",
    ethers.parseUnits("5100", 8)
  );
  const ftse100Feed = await resolveFeed(
    deployConfig.chainlink.ftse100,
    "FTSE 100 feed",
    ethers.parseUnits("1480", 8)
  );

  // Handle USDC address - deploy mock if needed for localhost
  let usdcAddress: string;
  if (isLocalNetwork) {
    if (!deployConfig.usdc || deployConfig.usdc === "") {
      console.log("Deploying mock USDC for localhost...");
      const MockERC20Factory = await ethers.getContractFactory("MockERC20");
      const mockUSDC = await MockERC20Factory.deploy(
        "USD Coin",
        "USDC",
        6, // USDC has 6 decimals
        ethers.parseUnits("1000000", 6) // Initial supply: 1M USDC
      );
      await mockUSDC.waitForDeployment();
      usdcAddress = mockUSDC.target as string;
      console.log("Mock USDC deployed to:", usdcAddress);
    } else {
      usdcAddress = validateAddress(deployConfig.usdc, "USDC");
    }
  } else {
    usdcAddress = validateAddress(deployConfig.usdc, "USDC");
  }

  const AssetUserAllowListFactory = await ethers.getContractFactory("AssetUserAllowList");
  const AssetVaultFactory = await ethers.getContractFactory("AssetVault");
  const AssetSharesFactory = await ethers.getContractFactory("AssetShares");
  const OracleRouterFactory = await ethers.getContractFactory("OracleRouter");

  // Deploy AssetUserAllowList first (required by AssetVault and AssetShares)
  console.log("\nDeploying AssetUserAllowList...");
  const assetUserAllowList = await AssetUserAllowListFactory.deploy();
  await assetUserAllowList.waitForDeployment();
  const assetUserAllowListAddress = String(assetUserAllowList.target);
  console.log("✓ AssetUserAllowList deployed to:", assetUserAllowListAddress);

  // Deploy OracleRouter (no dependencies)
  console.log("\nDeploying OracleRouter...");
  const oracleRouter = await OracleRouterFactory.deploy(
    ethUsdFeed,
    usdGbpFeed,
    goldUsdFeed,
    ftse100Feed
  );
  await oracleRouter.waitForDeployment();
  const oracleRouterAddress = oracleRouter.target as string;
  console.log("✓ OracleRouter deployed to:", oracleRouterAddress);

  // Deploy AssetVault with AssetUserAllowList
  console.log("\nDeploying AssetVault...");
  const assetVault = await AssetVaultFactory.deploy(assetUserAllowListAddress);
  await assetVault.waitForDeployment();
  // Use target property and ensure it's a string (getAddress() may have resolveName issues)
  const assetVaultAddress = String(assetVault.target);
  console.log("✓ AssetVault deployed to:", assetVaultAddress);

  console.log("\nDeploying AssetShares (with AssetVault and AssetUserAllowList addresses)...");
  const assetSharesURI = `https://api.property-assets.com/metadata/{id}.json`;
  const assetShares = await (AssetSharesFactory as any).deploy(
    String(usdcAddress),
    String(assetVaultAddress),
    assetUserAllowListAddress,
    assetSharesURI
  );
  await assetShares.waitForDeployment();
  const assetSharesAddress = assetShares.target as string;
  console.log("✓ AssetShares deployed to:", assetSharesAddress);

  console.log("\nAuthorizing AssetVault and AssetShares to use AssetUserAllowList...");
  await (assetUserAllowList as any).setAuthorizedCaller(assetVaultAddress, true);
  await (assetUserAllowList as any).setAuthorizedCaller(assetSharesAddress, true);
  console.log("✓ Authorized callers set");

  console.log("\nLinking AssetShares to AssetVault...");
  // Type assertion needed until typechain types are regenerated after contract changes
  const setAssetSharesTx = await (assetVault as any).setAssetShares(assetSharesAddress);
  await setAssetSharesTx.wait();
  console.log("✓ AssetShares address set in AssetVault");

  // Set pauser (multisig) for both contracts
  // For localhost/testing, use deployer address; for production, use actual multisig address
  const pauserAddress = deployConfig.admins?.defaultAdmin || deployer.address;
  
  console.log("\nSetting pauser (multisig) for AssetVault...");
  const setPauserVaultTx = await (assetVault as any).setPauser(pauserAddress);
  await setPauserVaultTx.wait();
  console.log("✓ Pauser set for AssetVault:", pauserAddress);

  console.log("\nSetting pauser (multisig) for AssetShares...");
  const setPauserSharesTx = await (assetShares as any).setPauser(pauserAddress);
  await setPauserSharesTx.wait();
  console.log("✓ Pauser set for AssetShares:", pauserAddress);

  // Persist deployment addresses for seed scripts
  const addressesPath = path.join(__dirname, "../..", "deployments", `${networkName}-addresses.json`);
  fs.writeFileSync(
    addressesPath,
    JSON.stringify(
      {
        USER_ALLOWLIST_ADDRESS: assetUserAllowListAddress,
        ORACLE_ROUTER_ADDRESS: oracleRouterAddress,
        ASSET_VAULT_ADDRESS: assetVaultAddress,
        ASSET_SHARES_ADDRESS: assetSharesAddress,
        USDC_ADDRESS: usdcAddress,
      },
      null,
      2
    )
  );
  console.log(`\n✓ Addresses saved to ${addressesPath}`);

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", networkName);
  console.log("Deployer:", deployer.address);
  console.log("\nContracts:");
  console.log("AssetUserAllowList:", assetUserAllowListAddress);
  console.log("OracleRouter:", oracleRouterAddress);
  console.log("AssetVault:", assetVaultAddress);
  console.log("AssetShares:", assetSharesAddress);
  console.log("USDC:", usdcAddress);
  console.log("\nConfiguration:");
  console.log("Pauser (Multisig):", pauserAddress);
  console.log("\n⚠️  NOTE: Pause/unpause functionality is controlled by the multisig address");
  console.log("   Ensure the multisig address is correctly configured in deploy config");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

