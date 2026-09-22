import { ethers } from "hardhat";
import { expect } from "chai";

describe("OracleRouter", () => {
  let mockEthUsd: any;
  let mockGbpUsd: any;
  let mockGoldUsd: any;
  let mockFtse100: any;
  let oracleRouter: any;

  beforeEach(async () => {
    const MockAgg = await ethers.getContractFactory("MockChainlinkAggregator");
    
    // Deploy mock aggregators with realistic values
    mockEthUsd = await MockAgg.deploy(ethers.parseUnits("2000", 8), 8); // ETH/USD ~3000
    await mockEthUsd.waitForDeployment();

    mockGbpUsd = await MockAgg.deploy(ethers.parseUnits("0.8", 8), 8); // GBP/USD ~0.8
    await mockGbpUsd.waitForDeployment();

    mockGoldUsd = await MockAgg.deploy(ethers.parseUnits("5000", 8), 8); // Gold/USD ~2000
    await mockGoldUsd.waitForDeployment();

    mockFtse100 = await MockAgg.deploy(ethers.parseUnits("1500", 8), 8); // FTSE 100 ~7500
    await mockFtse100.waitForDeployment();
  });

  describe("Deployment", () => {
    it("deploys successfully with valid feed addresses", async () => {
      const OracleRouter = await ethers.getContractFactory("OracleRouter");
      const router = await OracleRouter.deploy(
        await mockEthUsd.getAddress(),
        await mockGbpUsd.getAddress(),
        await mockGoldUsd.getAddress(),
        await mockFtse100.getAddress()
      );
      await router.waitForDeployment();

      expect(await router.getAddress()).to.properAddress;
    });

    it("reverts when ETH/USD feed address is zero", async () => {
      const OracleRouter = await ethers.getContractFactory("OracleRouter");
      await expect(
        OracleRouter.deploy(
          ethers.ZeroAddress,
          await mockGbpUsd.getAddress(),
          await mockGoldUsd.getAddress(),
          await mockFtse100.getAddress()
        )
      ).to.be.revertedWith("Invalid ETH/USD feed");
    });

    it("reverts when GBP/USD feed address is zero", async () => {
      const OracleRouter = await ethers.getContractFactory("OracleRouter");
      await expect(
        OracleRouter.deploy(
          await mockEthUsd.getAddress(),
          ethers.ZeroAddress,
          await mockGoldUsd.getAddress(),
          await mockFtse100.getAddress()
        )
      ).to.be.revertedWith("Invalid GBP/USD feed");
    });

    it("reverts when Gold/USD feed address is zero", async () => {
      const OracleRouter = await ethers.getContractFactory("OracleRouter");
      await expect(
        OracleRouter.deploy(
          await mockEthUsd.getAddress(),
          await mockGbpUsd.getAddress(),
          ethers.ZeroAddress,
          await mockFtse100.getAddress()
        )
      ).to.be.revertedWith("Invalid Gold/USD feed");
    });

    it("reverts when FTSE 100 feed address is zero", async () => {
      const OracleRouter = await ethers.getContractFactory("OracleRouter");
      await expect(
        OracleRouter.deploy(
          await mockEthUsd.getAddress(),
          await mockGbpUsd.getAddress(),
          await mockGoldUsd.getAddress(),
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("Invalid FTSE 100 feed");
    });

    it("stores feed addresses correctly", async () => {
      const OracleRouter = await ethers.getContractFactory("OracleRouter");
      const router = await OracleRouter.deploy(
        await mockEthUsd.getAddress(),
        await mockGbpUsd.getAddress(),
        await mockGoldUsd.getAddress(),
        await mockFtse100.getAddress()
      );
      await router.waitForDeployment();

      expect(await router.ethUsdFeed()).to.equal(await mockEthUsd.getAddress());
      expect(await router.gbpUsdFeed()).to.equal(await mockGbpUsd.getAddress());
      expect(await router.goldUsdFeed()).to.equal(await mockGoldUsd.getAddress());
      expect(await router.ftse100Feed()).to.equal(await mockFtse100.getAddress());
    });
  });

  describe("Price Queries", () => {
    beforeEach(async () => {
      const OracleRouter = await ethers.getContractFactory("OracleRouter");
      oracleRouter = await OracleRouter.deploy(
        await mockEthUsd.getAddress(),
        await mockGbpUsd.getAddress(),
        await mockGoldUsd.getAddress(),
        await mockFtse100.getAddress()
      );
      await oracleRouter.waitForDeployment();
    });

    it("returns correct ETH/USD price", async () => {
      const [price, updatedAt] = await oracleRouter.getEthUsdPrice();
      expect(price).to.equal(ethers.parseUnits("2000", 8));
      expect(updatedAt).to.be.gt(0);
    });

    it("returns correct GBP/USD price", async () => {
      const [price, updatedAt] = await oracleRouter.getGbpUsdPrice();
      expect(price).to.equal(ethers.parseUnits("0.8", 8));
      expect(updatedAt).to.be.gt(0);
    });

    it("returns correct Gold/USD price", async () => {
      const [price, updatedAt] = await oracleRouter.getGoldUsdPrice();
      expect(price).to.equal(ethers.parseUnits("5000", 8));
      expect(updatedAt).to.be.gt(0);
    });

    it("returns correct FTSE 100 value", async () => {
      const [value, updatedAt] = await oracleRouter.getFtse100Value();
      expect(value).to.equal(ethers.parseUnits("1500", 8));
      expect(updatedAt).to.be.gt(0);
    });

    it("updates prices when feed values change", async () => {
      // Update ETH/USD feed
      const newEthPrice = ethers.parseUnits("3500", 8);
      await mockEthUsd.updateAnswer(newEthPrice);
      
      const [price] = await oracleRouter.getEthUsdPrice();
      expect(price).to.equal(newEthPrice);
    });
  });
});

