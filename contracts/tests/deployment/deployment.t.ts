import hre, { ethers } from "hardhat";
import { expect } from "chai";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type DeployedAddresses = {
  USER_ALLOWLIST_ADDRESS: string;
  ORACLE_ROUTER_ADDRESS: string;
  ASSET_VAULT_ADDRESS: string;
  ASSET_SHARES_ADDRESS: string;
  USDC_ADDRESS: string;
};

type DeployInputs = {
  usdc?: string;
  chainlink?: {
    ethUsd?: string;
    usdGbp?: string;
    goldUsd?: string;
    ftse100?: string;
  };
  admins?: {
    defaultAdmin?: string;
  };
};

const DEPLOY_NETWORKS = new Set(["sepolia", "mainnet", "base", "baseSepolia"]);
const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
const USDC_DECIMALS_ABI = ["function decimals() view returns (uint8)"];

const deploymentsDir = path.join(process.cwd(), "deployments");

function loadJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function loadAddresses(network: string): DeployedAddresses {
  const filePath = path.join(deploymentsDir, `${network}-addresses.json`);
  if (!existsSync(filePath)) {
    throw new Error(`Missing ${filePath} — deploy to ${network} first`);
  }
  return loadJson<DeployedAddresses>(filePath);
}

function loadInputs(network: string): DeployInputs {
  const filePath = path.join(deploymentsDir, `${network}.json`);
  if (!existsSync(filePath)) {
    return {};
  }
  return loadJson<DeployInputs>(filePath);
}

async function expectBytecode(address: string, label: string): Promise<void> {
  const code = await ethers.provider.getCode(address);
  expect(code, `${label} at ${address} has no bytecode`).to.not.equal("0x");
}

describe("Deployed contracts", () => {
  let addresses: DeployedAddresses;
  let inputs: DeployInputs;

  before(function () {
    if (!DEPLOY_NETWORKS.has(hre.network.name)) {
      this.skip();
    }
    addresses = loadAddresses(hre.network.name);
    inputs = loadInputs(hre.network.name);
  });

  describe("AssetVault", () => {
    it("has bytecode at the recorded address", async () => {
      await expectBytecode(addresses.ASSET_VAULT_ADDRESS, "AssetVault");
    });

    it("is named Asset Vault", async () => {
      const vault = await ethers.getContractAt("AssetVault", addresses.ASSET_VAULT_ADDRESS);
      expect(await vault.name()).to.equal("Asset Vault");
    });

    it("uses symbol VAULT", async () => {
      const vault = await ethers.getContractAt("AssetVault", addresses.ASSET_VAULT_ADDRESS);
      expect(await vault.symbol()).to.equal("VAULT");
    });

    it("points at the recorded allowlist", async () => {
      const vault = await ethers.getContractAt("AssetVault", addresses.ASSET_VAULT_ADDRESS);
      expect(await vault.userAllowList()).to.equal(
        ethers.getAddress(addresses.USER_ALLOWLIST_ADDRESS)
      );
    });

    it("points at the recorded AssetShares", async () => {
      const vault = await ethers.getContractAt("AssetVault", addresses.ASSET_VAULT_ADDRESS);
      expect(await vault.assetShares()).to.equal(ethers.getAddress(addresses.ASSET_SHARES_ADDRESS));
    });

    it("is not paused", async () => {
      const vault = await ethers.getContractAt("AssetVault", addresses.ASSET_VAULT_ADDRESS);
      expect(await vault.paused()).to.equal(false);
    });

    it("has a pauser with PAUSER_ROLE", async () => {
      const vault = await ethers.getContractAt("AssetVault", addresses.ASSET_VAULT_ADDRESS);
      const pauser = await vault.pauser();
      expect(pauser).to.not.equal(ethers.ZeroAddress);
      expect(await vault.hasRole(PAUSER_ROLE, pauser)).to.equal(true);
    });

    it("uses the configured default admin as pauser when one is set", async () => {
      const expected = process.env.ADMIN_ADDRESS || inputs.admins?.defaultAdmin;
      if (!expected) {
        return;
      }
      const vault = await ethers.getContractAt("AssetVault", addresses.ASSET_VAULT_ADDRESS);
      expect(await vault.pauser()).to.equal(ethers.getAddress(expected));
    });
  });

  describe("AssetShares", () => {
    it("has bytecode at the recorded address", async () => {
      await expectBytecode(addresses.ASSET_SHARES_ADDRESS, "AssetShares");
    });

    it("points at the recorded USDC", async () => {
      const shares = await ethers.getContractAt("AssetShares", addresses.ASSET_SHARES_ADDRESS);
      expect(await shares.USDC()).to.equal(ethers.getAddress(addresses.USDC_ADDRESS));
    });

    it("points at the recorded vault", async () => {
      const shares = await ethers.getContractAt("AssetShares", addresses.ASSET_SHARES_ADDRESS);
      expect(await shares.assetVault()).to.equal(ethers.getAddress(addresses.ASSET_VAULT_ADDRESS));
    });

    it("points at the recorded allowlist", async () => {
      const shares = await ethers.getContractAt("AssetShares", addresses.ASSET_SHARES_ADDRESS);
      expect(await shares.userAllowList()).to.equal(
        ethers.getAddress(addresses.USER_ALLOWLIST_ADDRESS)
      );
    });

    it("settles in the configured USDC", async () => {
      const expected = process.env.USDC_ADDRESS || inputs.usdc;
      if (!expected) {
        return;
      }
      const shares = await ethers.getContractAt("AssetShares", addresses.ASSET_SHARES_ADDRESS);
      expect(await shares.USDC()).to.equal(ethers.getAddress(expected));
    });

    it("is not paused", async () => {
      const shares = await ethers.getContractAt("AssetShares", addresses.ASSET_SHARES_ADDRESS);
      expect(await shares.paused()).to.equal(false);
    });

    it("shares the vault pauser", async () => {
      const vault = await ethers.getContractAt("AssetVault", addresses.ASSET_VAULT_ADDRESS);
      const shares = await ethers.getContractAt("AssetShares", addresses.ASSET_SHARES_ADDRESS);
      expect(await shares.pauser()).to.equal(await vault.pauser());
    });
  });

  describe("AssetUserAllowList", () => {
    it("has bytecode at the recorded address", async () => {
      await expectBytecode(addresses.USER_ALLOWLIST_ADDRESS, "AssetUserAllowList");
    });

    it("authorizes the recorded vault as a caller", async () => {
      const allowList = await ethers.getContractAt(
        "AssetUserAllowList",
        addresses.USER_ALLOWLIST_ADDRESS
      );
      expect(await allowList.isAuthorizedCaller(addresses.ASSET_VAULT_ADDRESS)).to.equal(true);
    });

    it("authorizes the recorded shares as a caller", async () => {
      const allowList = await ethers.getContractAt(
        "AssetUserAllowList",
        addresses.USER_ALLOWLIST_ADDRESS
      );
      expect(await allowList.isAuthorizedCaller(addresses.ASSET_SHARES_ADDRESS)).to.equal(true);
    });
  });

  describe("OracleRouter", () => {
    it("has bytecode at the recorded address", async () => {
      await expectBytecode(addresses.ORACLE_ROUTER_ADDRESS, "OracleRouter");
    });

    it("is wired to the configured Chainlink feeds", async () => {
      const router = await ethers.getContractAt("OracleRouter", addresses.ORACLE_ROUTER_ADDRESS);
      const expected = {
        ethUsd: process.env.CHAINLINK_ETH_USD_ADDRESS || inputs.chainlink?.ethUsd,
        usdGbp: process.env.CHAINLINK_USD_GBP_ADDRESS || inputs.chainlink?.usdGbp,
        goldUsd: process.env.CHAINLINK_XAU_USD_ADDRESS || inputs.chainlink?.goldUsd,
        ftse100: process.env.CHAINLINK_FTSE100_ADDRESS || inputs.chainlink?.ftse100,
      };
      if (expected.ethUsd) {
        expect(await router.ethUsdFeed()).to.equal(ethers.getAddress(expected.ethUsd));
      }
      if (expected.usdGbp) {
        expect(await router.gbpUsdFeed()).to.equal(ethers.getAddress(expected.usdGbp));
      }
      if (expected.goldUsd) {
        expect(await router.goldUsdFeed()).to.equal(ethers.getAddress(expected.goldUsd));
      }
      if (expected.ftse100) {
        expect(await router.ftse100Feed()).to.equal(ethers.getAddress(expected.ftse100));
      }
    });

    it("points each feed at a contract", async () => {
      const router = await ethers.getContractAt("OracleRouter", addresses.ORACLE_ROUTER_ADDRESS);
      await expectBytecode(await router.ethUsdFeed(), "ETH/USD feed");
      await expectBytecode(await router.gbpUsdFeed(), "USD/GBP feed");
      await expectBytecode(await router.goldUsdFeed(), "Gold/USD feed");
      await expectBytecode(await router.ftse100Feed(), "FTSE 100 feed");
    });
  });

  describe("USDC", () => {
    it("has bytecode at the recorded address", async () => {
      await expectBytecode(addresses.USDC_ADDRESS, "USDC");
    });

    it("has 6 decimals", async () => {
      const usdc = new ethers.Contract(addresses.USDC_ADDRESS, USDC_DECIMALS_ABI, ethers.provider);
      expect(await usdc.decimals()).to.equal(6n);
    });
  });
});
