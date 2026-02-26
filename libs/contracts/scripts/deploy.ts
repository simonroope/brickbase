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

async function main() {
  const networkName = hre.network.name;
  const configPath = path.join(__dirname, "..", "deploy", `${networkName}.json`);

  if (!fs.existsSync(configPath)) {
    throw new Error(`No deploy config found for network ${networkName} at ${configPath}`);
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const deployConfig = JSON.parse(raw) as DeployConfig;

  const [deployer] = await ethers.getSigners();
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

  let ethUsdFeed: string;
  let usdGbpFeed: string;
  let goldUsdFeed: string;
  let ftse100Feed: string;

  // For localhost/hardhat networks, deploy mock aggregators if addresses are empty
  if (networkName === "localhost" || networkName === "hardhat") {
    if (!deployConfig.chainlink.ethUsd || deployConfig.chainlink.ethUsd === "") {
      console.log("Deploying mock Chainlink aggregators for localhost...");
      const MockAggFactory = await ethers.getContractFactory("MockChainlinkAggregator");
      
      // Deploy mock aggregators with default values (1 USD = 1, 8 decimals)
      const mockEthUsd = await MockAggFactory.deploy(ethers.parseUnits("2010", 8), 8); // ETH/USD ~3000
      await mockEthUsd.waitForDeployment();
      ethUsdFeed = mockEthUsd.target as string;

      const mockUsdGbp = await MockAggFactory.deploy(ethers.parseUnits("0.8", 8), 8); // USD/GBP ~0.8
      await mockUsdGbp.waitForDeployment();
      usdGbpFeed = mockUsdGbp.target as string;

      const mockGoldUsd = await MockAggFactory.deploy(ethers.parseUnits("5100", 8), 8); // USD/Gold ~2000
      await mockGoldUsd.waitForDeployment();
      goldUsdFeed = mockGoldUsd.target as string;

      const mockFtse100 = await MockAggFactory.deploy(ethers.parseUnits("1480", 8), 8); // FTSE 100 ~7500
      await mockFtse100.waitForDeployment();
      ftse100Feed = mockFtse100.target as string;

      console.log("Mock aggregators deployed:");
      console.log(`  ETH/USD: ${ethUsdFeed}`);
      console.log(`  USD/GBP: ${usdGbpFeed}`);
      console.log(`  Gold/USD: ${goldUsdFeed}`);
      console.log(`  FTSE 100: ${ftse100Feed}`);
    } else {
      ethUsdFeed = validateAddress(deployConfig.chainlink.ethUsd, "ETH/USD feed");
      usdGbpFeed = validateAddress(deployConfig.chainlink.usdGbp, "USD/GBP feed");
      goldUsdFeed = validateAddress(deployConfig.chainlink.goldUsd, "Gold/USD feed");
      ftse100Feed = validateAddress(deployConfig.chainlink.ftse100, "FTSE 100 feed");
    }
  } else {
    // For other networks, addresses must be provided in config
    ethUsdFeed = validateAddress(deployConfig.chainlink.ethUsd, "ETH/USD feed");
    usdGbpFeed = validateAddress(deployConfig.chainlink.usdGbp, "USD/GBP feed");
    goldUsdFeed = validateAddress(deployConfig.chainlink.goldUsd, "Gold/USD feed");
    ftse100Feed = validateAddress(deployConfig.chainlink.ftse100, "FTSE 100 feed");
  }

  // Handle USDC address - deploy mock if needed for localhost
  let usdcAddress: string;
  if (networkName === "localhost" || networkName === "hardhat") {
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
  const addressesPath = path.join(__dirname, "..", "deploy", `${networkName}-addresses.json`);
  fs.writeFileSync(
    addressesPath,
    JSON.stringify(
      {
        NEXT_PUBLIC_USER_ALLOWLIST_ADDRESS: assetUserAllowListAddress,
        NEXT_PUBLIC_ORACLE_ROUTER_ADDRESS: oracleRouterAddress,
        NEXT_PUBLIC_ASSET_VAULT_ADDRESS:assetVaultAddress,
        NEXT_PUBLIC_ASSET_SHARES_ADDRESS: assetSharesAddress,
        NEXT_PUBLIC_USDC_ADDRESS: usdcAddress,
        assetUserAllowList: assetUserAllowListAddress,
        oracleRouter: oracleRouterAddress,
        assetVault: assetVaultAddress,
        assetShares: assetSharesAddress,
        usdc: usdcAddress,
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

