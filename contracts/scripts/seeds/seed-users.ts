import hre, { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { loadDeployedAddresses } from "../loadDeployedAddresses";
import { resolveLiveSeedAllowlist } from "../seedAllowlist";
import { assertProviderChainId, resolveTargetChain } from "../seedChain";

type DeployConfig = {
  admins?: {
    defaultAdmin?: string;
  };
  seed?: {
    expectedDeployer?: string;
    usersToWhitelist?: string[];
    /** Users to fund with USDC. Amount in human-readable USDC (e.g. "1000"). On localhost MockERC20.mint is used; on other networks signer must have balance. */
    usdcUsersToFund?: Array<{ address: string; amount: string }>;
  };
};

async function main() {
  const networkName = resolveTargetChain(hre.network.name);
  const deployConfigPath = path.join(__dirname, "../..", "deployments", `${networkName}.json`);
  const addresses = loadDeployedAddresses(networkName);

  const signers = await ethers.getSigners();
  const [signer] = signers;
  const { chainId } = await ethers.provider.getNetwork();
  assertProviderChainId(networkName, chainId);
  const isLocalNetwork = networkName === "localhost";
  console.log(`Seeding with signer ${signer.address} on ${networkName} (chainId ${chainId})`);

  const deployConfig: DeployConfig = fs.existsSync(deployConfigPath)
    ? JSON.parse(fs.readFileSync(deployConfigPath, "utf8"))
    : {};

  // Resolve users to whitelist and expected deployer
  let usersToWhitelist: string[];
  let expectedDeployer: string | undefined;

  if (isLocalNetwork) {
    expectedDeployer = signers[0].address;
    usersToWhitelist = signers.slice(1, 3).map((s) => s.address);
    usersToWhitelist.push("0xC357cfe6f8acDB4e2D0Daa9751F24DB77Bfbfe3e");
  } else {
    const resolved = resolveLiveSeedAllowlist(signer.address, {
      expectedDeployer: deployConfig.seed?.expectedDeployer,
      usersToWhitelist: deployConfig.seed?.usersToWhitelist,
      defaultAdmin: deployConfig.admins?.defaultAdmin,
    });
    expectedDeployer = resolved.expectedDeployer;
    usersToWhitelist = resolved.usersToWhitelist;
  }

  if (!isLocalNetwork) {
    if (signer.address.toLowerCase() !== expectedDeployer.toLowerCase()) {
      throw new Error(
        `Signer (${signer.address}) does not match expected deployer (${expectedDeployer}). ` +
          `Set PRIVATE_KEY in .env to the deployer's key, or set seed.expectedDeployer / admins.defaultAdmin in deployments/${networkName}.json.`
      );
    }
  }

  const assetShares = await ethers.getContractAt("AssetShares", addresses.ASSET_SHARES_ADDRESS);

  for (const user of usersToWhitelist) {
    if (!ethers.isAddress(user)) {
      throw new Error(`Invalid address in whitelist: ${user}`);
    }
    const tx = await assetShares.setUserAllowed(user, true);
    await tx.wait();
    console.log(`✓ Added ${user} to whitelist`);
  }

  // USDC funding: config, minting (localhost/MockERC20), transfer
  const usdcUsersToFund: Array<{ address: string; amount: string }> = isLocalNetwork
    ? [
        { address: signer.address, amount: "10000" },
        ...signers.slice(1, 3).map((s) => ({ address: s.address, amount: "10000" })),
        { address: "0xC357cfe6f8acDB4e2D0Daa9751F24DB77Bfbfe3e", amount: "10000" },
      ]
    : deployConfig.seed?.usdcUsersToFund ?? [];

  const usdc = addresses.USDC_ADDRESS
    ? await ethers.getContractAt("MockERC20", addresses.USDC_ADDRESS)
    : null;

  if (usdc && usdcUsersToFund.length > 0) {
    console.log("\nFunding users with USDC...");
    for (const { address, amount } of usdcUsersToFund) {
      if (!ethers.isAddress(address)) {
        throw new Error(`Invalid address in usdcUsersToFund: ${address}`);
      }
      const amountWei = ethers.parseUnits(amount, 6);
      if (isLocalNetwork) {
        await usdc.mint(address, amountWei);
        console.log(`✓ Minted ${amount} USDC to ${address}`);
      } else {
        const signerBalance = await usdc.balanceOf(signer.address);
        if (signerBalance >= amountWei) {
          await usdc.transfer(address, amountWei);
          console.log(`✓ Transferred ${amount} USDC to ${address}`);
        } else {
          console.warn(`⚠️ Signer has insufficient USDC to fund ${address} (need ${amount} USDC) - skipping`);
        }
      }
    }
  }

  console.log("\n=== Seed Complete ===");
  console.log(`Added ${usersToWhitelist.length} users to the whitelist`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
