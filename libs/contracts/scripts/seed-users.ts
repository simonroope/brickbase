import hre, { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";


type AddressesConfig = {
  assetVault: string;
  assetShares: string;
};

type DeployConfig = {
  seed?: {
    expectedDeployer?: string;
    usersToWhitelist?: string[];
  };
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
  console.log(`Seeding with signer ${signer.address} on network ${networkName}`);

  // Resolve users to whitelist and expected deployer
  let usersToWhitelist: string[];
  let expectedDeployer: string | undefined;

  if (isLocalNetwork) {
    expectedDeployer = signers[0].address;
    usersToWhitelist = signers.slice(1, 3).map((s) => s.address);
    usersToWhitelist.push("0xC357cfe6f8acDB4e2D0Daa9751F24DB77Bfbfe3e");
  } else {
    // Sepolia, mainnet, etc.: use deploy config
    const deployConfig: DeployConfig = fs.existsSync(deployConfigPath)
      ? JSON.parse(fs.readFileSync(deployConfigPath, "utf8"))
      : {};
    expectedDeployer = deployConfig.seed?.expectedDeployer;
    usersToWhitelist = deployConfig.seed?.usersToWhitelist ?? [];

    if (usersToWhitelist.length === 0) {
      throw new Error(
        `No usersToWhitelist in deploy/${networkName}.json. Add "seed": { "expectedDeployer": "0x...", "usersToWhitelist": ["0x...", "0x..."] }`
      );
    }
  }

  if (!isLocalNetwork) {
    if (expectedDeployer && signer.address.toLowerCase() !== expectedDeployer.toLowerCase()) {
      throw new Error(
        `Signer (${signer.address}) does not match expected deployer (${expectedDeployer}). ` +
          `Set PRIVATE_KEY in .env to the deployer's key, and ensure expectedDeployer in deploy/${networkName}.json is correct.`
      );
    }
    if (!expectedDeployer) {
      throw new Error(
        `deploy/${networkName}.json must have "seed": { "expectedDeployer": "0x...", "usersToWhitelist": ["0x..."] } for non-localhost networks.`
      );
    }
  }

  const assetShares = await ethers.getContractAt("AssetShares", addresses.assetShares);

  for (const user of usersToWhitelist) {
    if (!ethers.isAddress(user)) {
      throw new Error(`Invalid address in whitelist: ${user}`);
    }
    const tx = await assetShares.setUserAllowed(user, true);
    await tx.wait();
    console.log(`✓ Added ${user} to whitelist`);
  }

  console.log("\n=== Seed Complete ===");
  console.log(`Added ${usersToWhitelist.length} users to the whitelist`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
