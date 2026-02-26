import hre, { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

type AddressesConfig = {
  assetVault: string;
  assetShares: string;
  usdc?: string;
};

type DeployConfig = {
  seed?: {
    expectedDeployer?: string;
  };
};

// Asset 1 configuration (capitalValue/incomeValue use USDC decimals = 6)
const ASSET_1 = {
  assetId: 1,
  // AssetVault properties
  status: 0, // Active
  metadataURI: "https://ivory-independent-bison-569.mypinata.cloud/ipfs/bafkreih6m7alojklbblqvtuhizkduouuepawfpax2jexuac4w5xse2amby",
  capitalValue: ethers.parseUnits("155000000", 6), // $155M (USDC 6 decimals)
  incomeValue: ethers.parseUnits("500000", 6), // $500k (USDC 6 decimals)
  // AssetShares
  totalSupply: ethers.parseUnits("10000", 18),
  availableSupply: ethers.parseUnits("10000", 18),
  sharePrice: ethers.parseUnits("2", 6), // $2.00 per share (USDC 6 decimals)
  tradingEnabled: true,
};

// Asset 2 configuration (capitalValue/incomeValue use USDC decimals = 6)
const ASSET_2 = {
  assetId: 2,
  // AssetVault properties
  status: 0, // Active
  metadataURI: "https://ivory-independent-bison-569.mypinata.cloud/ipfs/bafkreibsqx5frs2ke2hjvm3rra3fpcvikdnolipups7kacp5ossygehkc4",
  capitalValue: ethers.parseUnits("102000000", 6), // $102M (USDC 6 decimals)
  incomeValue: ethers.parseUnits("550000", 6), // $550k (USDC 6 decimals)
  // AssetShares
  totalSupply: ethers.parseUnits("25000", 18),
  sharePrice: ethers.parseUnits("2.51", 6), // $2.51 per share (USDC 6 decimals)
  tradingEnabled: true,
  // To get availableSupply=1000, we simulate 1000 shares purchased (by signer)
  sharesToPurchase: ethers.parseUnits("1000", 18),
};

async function main() {
  const networkName = hre.network.name;
  const addressesPath = path.join(__dirname, "..", "deploy", `${networkName}-addresses.json`);
  const deployConfigPath = path.join(__dirname, "..", "deploy", `${networkName}.json`);

  if (!fs.existsSync(addressesPath)) {
    throw new Error(
      `No deployment addresses found at ${addressesPath}. Run 'npx hardhat run scripts/deploy.ts --network ${networkName}' first.`
    );
  }

  const raw = fs.readFileSync(addressesPath, "utf8");
  const addresses = JSON.parse(raw) as AddressesConfig;

  const signers = await ethers.getSigners();
  const [signer] = signers;
  const isLocalNetwork = networkName === "localhost" || networkName === "hardhat";
  console.log(`Seeding assets with signer ${signer.address} on network ${networkName}`);

  // On non-localhost (e.g. Sepolia), validate signer matches expected deployer from config
  if (!isLocalNetwork) {
    const deployConfig: DeployConfig = fs.existsSync(deployConfigPath)
      ? JSON.parse(fs.readFileSync(deployConfigPath, "utf8"))
      : {};
    const expectedDeployer = deployConfig.seed?.expectedDeployer;

    if (expectedDeployer && signer.address.toLowerCase() !== expectedDeployer.toLowerCase()) {
      throw new Error(
        `Signer (${signer.address}) does not match expected deployer (${expectedDeployer}). ` +
          `Set PRIVATE_KEY in .env to the deployer's key. Ensure deploy/${networkName}.json has "seed": { "expectedDeployer": "0x..." }.`
      );
    }
    if (!expectedDeployer) {
      throw new Error(
        `deploy/${networkName}.json must have "seed": { "expectedDeployer": "0x..." } to ensure correct account is used.`
      );
    }
  }

  const assetVault = await ethers.getContractAt("AssetVault", addresses.assetVault);
  const assetShares = await ethers.getContractAt("AssetShares", addresses.assetShares);

  const assertAssetVaultedEvent = (
    receipt: { logs: Array<{ topics: string[] | readonly string[]; data: string }> } | null,
    expectedAssetId: number
  ) => {
    if (!receipt) throw new Error("No receipt received");
    for (const log of receipt.logs) {
      try {
        const parsed = assetVault.interface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === "AssetVaulted") {
          const assetId = Number(parsed.args.assetId);
          if (assetId !== expectedAssetId) {
            throw new Error(`AssetVaulted event assetId mismatch: expected ${expectedAssetId}, got ${assetId}`);
          }
          console.log(`  ✓ Event AssetVaulted verified: assetId=${assetId}, status=${parsed.args.status}, capitalValue=${parsed.args.capitalValue}, incomeValue=${parsed.args.incomeValue}`);
          return;
        }
      } catch (e: any) {
        if (e.message?.includes("AssetVaulted event") || e.message?.includes("No receipt")) throw e;
        // skip non-AssetVaulted logs
      }
    }
    throw new Error(`AssetVaulted event not found in transaction logs - asset ${expectedAssetId} may not have been created`);
  };
  const usdc = addresses.usdc
    ? await ethers.getContractAt("MockERC20", addresses.usdc)
    : null;

  // Create asset 1 in AssetVault (status, capitalValue, incomeValue, metadataURI)
  // Avoid getAsset pre-check since deployed contract may have different ABI.
  console.log("\nCreating asset 1 in AssetVault...");
  try {
    const createAssetTx = await assetVault.createAsset(
      ASSET_1.assetId,
      ASSET_1.status,
      ASSET_1.capitalValue,
      ASSET_1.incomeValue,
      ASSET_1.metadataURI
    );
    const receipt = await createAssetTx.wait();
    assertAssetVaultedEvent(receipt, ASSET_1.assetId);
    console.log(`✓ Asset 1 created: status=${ASSET_1.status}, capitalValue=$155M, incomeValue=$500k, metadata=${ASSET_1.metadataURI}`);
  } catch (e: any) {
    const reason = e.reason ?? e.message ?? String(e);
    if (String(reason).includes("Asset already exists")) {
      console.log(`⊘ Asset 1 already exists, skipping`);
    } else {
      throw new Error(`createAsset(1) failed: ${reason}. Ensure AssetVault at ${addresses.assetVault} is deployed from the latest code and signer has ASSET_MANAGER_ROLE.`);
    }
  }

  console.log("Checking if signer has MINTER_ROLE...");
  // Grant MINTER_ROLE to signer to create shares (AssetVault has it by default).
  // Use locally computed role to avoid BAD_DATA when deployed contract ABI differs.
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
  if (!(await assetShares.hasRole(MINTER_ROLE, signer.address))) {
    const tx = await assetShares.grantRole(MINTER_ROLE, signer.address);
    await tx.wait();
    console.log(`✓ Granted MINTER_ROLE to ${signer.address}`);
  }

  // Create ShareInfo for asset 1 (totalSupply, availableSupply, sharePrice, tradingEnabled)
  console.log("\nCreating ShareInfo for asset 1...");
  const createSharesTx = await assetShares.createAssetShares(
    ASSET_1.assetId,
    ASSET_1.totalSupply,
    ASSET_1.sharePrice
  );
  await createSharesTx.wait();
  console.log(`✓ ShareInfo: totalSupply=1000, availableSupply=1000, sharePrice=$2, tradingEnabled=false`);

  // Create asset 2 in AssetVault
  console.log("\nCreating asset 2 in AssetVault...");
  try {
    const createAsset2Tx = await assetVault.createAsset(
      ASSET_2.assetId,
      ASSET_2.status,
      ASSET_2.capitalValue,
      ASSET_2.incomeValue,
      ASSET_2.metadataURI
    );
    const receipt2 = await createAsset2Tx.wait();
    assertAssetVaultedEvent(receipt2, ASSET_2.assetId);
    console.log(`✓ Asset 2: status=${ASSET_2.status}, capitalValue=$102M, incomeValue=$550k, metadata=${ASSET_2.metadataURI}`);
  } catch (e: any) {
    const reason = e.reason ?? e.message ?? String(e);
    if (String(reason).includes("Asset already exists")) {
      console.log(`⊘ Asset 2 already exists, skipping`);
    } else {
      throw new Error(`createAsset(2) failed: ${reason}. Ensure AssetVault at ${addresses.assetVault} is deployed from the latest code and signer has ASSET_MANAGER_ROLE.`);
    }
  }

  // Create ShareInfo for asset 2
  console.log("\nCreating ShareInfo for asset 2...");
  const createShares2Tx = await assetShares.createAssetShares(
    ASSET_2.assetId,
    ASSET_2.totalSupply,
    ASSET_2.sharePrice
  );
  await createShares2Tx.wait();

  // Enable trading for asset 2
  const setTradingTx = await assetShares.setTradingEnabled(ASSET_2.assetId, ASSET_2.tradingEnabled);
  await setTradingTx.wait();
  console.log(`✓ ShareInfo: totalSupply=2000, sharePrice=$2.5, tradingEnabled=true`);

  // Purchase 1000 shares to achieve availableSupply=1000 (signer must be whitelisted and have USDC)
  if (usdc) {
    await assetShares.setUserAllowed(signer.address, true);
    const cost = (ASSET_2.sharesToPurchase * ASSET_2.sharePrice) / ethers.parseUnits("1", 18);
    const balance = await usdc.balanceOf(signer.address);
    if (balance >= cost) {
      await usdc.approve(await assetShares.getAddress(), cost);
      const purchaseTx = await assetShares.purchaseShares(ASSET_2.assetId, ASSET_2.sharesToPurchase);
      await purchaseTx.wait();
      console.log(`✓ Purchased 1000 shares (availableSupply now 1000)`);
    } else {
      console.warn(`⚠️ Signer has insufficient USDC (need ${ethers.formatUnits(cost, 6)} USDC) - skipping purchase; availableSupply remains 2000`);
    }
  } else {
    console.warn(`⚠️ USDC address not in addresses file - cannot simulate purchase; availableSupply remains 2000`);
  }

  console.log("\n=== Seed Complete ===");
  console.log("Asset 1: ipfs://prop001-metadata.json");
  console.log("Expected metadata-1.json contents:");
  console.log(JSON.stringify({
    assetType: "office",
    name: "Lyons House",
    address: "123 Cannon Street, London EC1 3JN",
    purchasePrice: 140000000,
    purchaseDate: "2019-04-01",
    area: 10000,
    yearBuilt: 2001,
    jurisdiction: "UK",
    images: ["ipfs://Qm...11", "ipfs://Qm...12"],
    documents: ["ipfs://Qm...", "ipfs://Qm..."],
  }, null, 2));
  console.log("\nAsset 2: ipfs://metadata-2.json");
  console.log("Expected prop002-metadata.json contents:");
  console.log(JSON.stringify({
    assetType: "office",
    name: "Dewis House",
    address: "55 Oxford Street, London W1 4AW",
    purchasePrice: 88000000,
    purchaseDate: "2024-03-21",
    area: 20000,
    yearBuilt: 1999,
    jurisdiction: "UK",
    images: ["ipfs://Qm...21", "ipfs://Qm...22"],
    documents: ["ipfs://Qm...", "ipfs://Qm..."],
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
