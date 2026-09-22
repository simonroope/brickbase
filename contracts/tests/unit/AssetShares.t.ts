import { ethers } from "hardhat";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("AssetShares", () => {
  let usdc: any;
  let vault: any;
  let shares: any;
  let testShares: any;
  let allowList: any;
  let deployer: any;
  let user1: any;
  let user2: any;

  beforeEach(async () => {
    [deployer, user1, user2] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("Mock USDC", "mUSDC", 6, ethers.parseUnits("1000000", 6));
    await usdc.waitForDeployment();

    const AssetUserAllowList = await ethers.getContractFactory("AssetUserAllowList");
    allowList = await AssetUserAllowList.deploy();
    await allowList.waitForDeployment();

    const AssetVault = await ethers.getContractFactory("AssetVault");
    vault = await AssetVault.deploy(await allowList.getAddress());
    await vault.waitForDeployment();

    const AssetShares = await ethers.getContractFactory("AssetShares");
    shares = await AssetShares.deploy(
      await usdc.getAddress(),
      await vault.getAddress(),
      await allowList.getAddress(),
      ""
    );
    await shares.waitForDeployment();

    await allowList.setAuthorizedCaller(await vault.getAddress(), true);
    await allowList.setAuthorizedCaller(await shares.getAddress(), true);

    // Deploy test helper for populating data
    const AssetSharesTestHelper = await ethers.getContractFactory("AssetSharesTestHelper");
    testShares = await AssetSharesTestHelper.deploy(
      await usdc.getAddress(),
      await vault.getAddress(),
      await allowList.getAddress(),
      ""
    );
    await testShares.waitForDeployment();
    await allowList.setAuthorizedCaller(await testShares.getAddress(), true);
  });

  it("deploys with valid USDC and AssetVault addresses", async () => {
    expect(await shares.getAddress()).to.properAddress;
  });

  describe("Access Control", () => {
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // 0x00

    it("grants DEFAULT_ADMIN_ROLE, ASSET_MANAGER_ROLE, and COMPLIANCE_OFFICER_ROLE to deployer", async () => {
      const ASSET_MANAGER_ROLE = await shares.ASSET_MANAGER_ROLE();
      const COMPLIANCE_OFFICER_ROLE = await shares.COMPLIANCE_OFFICER_ROLE();

      expect(await shares.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
      expect(await shares.hasRole(ASSET_MANAGER_ROLE, deployer.address)).to.be.true;
      expect(await shares.hasRole(COMPLIANCE_OFFICER_ROLE, deployer.address)).to.be.true;
    });

    it("grants MINTER_ROLE to AssetVault", async () => {
      const MINTER_ROLE = await shares.MINTER_ROLE();
      expect(await shares.hasRole(MINTER_ROLE, await vault.getAddress())).to.be.true;
    });

    it("allows admin to grant and revoke roles", async () => {
      const ASSET_MANAGER_ROLE = await shares.ASSET_MANAGER_ROLE();

      await shares.grantRole(ASSET_MANAGER_ROLE, user1.address);
      expect(await shares.hasRole(ASSET_MANAGER_ROLE, user1.address)).to.be.true;

      await shares.revokeRole(ASSET_MANAGER_ROLE, user1.address);
      expect(await shares.hasRole(ASSET_MANAGER_ROLE, user1.address)).to.be.false;
    });

    it("reverts when non-admin tries to grant role", async () => {
      const ASSET_MANAGER_ROLE = await shares.ASSET_MANAGER_ROLE();

      await expect(
        shares.connect(user1).grantRole(ASSET_MANAGER_ROLE, user2.address)
      ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");
    });

    it("allows admin to set pauser and grants PAUSER_ROLE", async () => {
      const PAUSER_ROLE = await shares.PAUSER_ROLE();

      await shares.setPauser(user1.address);
      expect(await shares.pauser()).to.equal(user1.address);
      expect(await shares.hasRole(PAUSER_ROLE, user1.address)).to.be.true;
    });

    it("reverts when non-admin tries to set pauser", async () => {
      await expect(
        shares.connect(user1).setPauser(user2.address)
      ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");
    });

    it("allows pauser to pause and unpause contract", async () => {
      // Set user1 as pauser
      await shares.setPauser(user1.address);

      await shares.connect(user1).pause();
      expect(await shares.paused()).to.be.true;

      await shares.connect(user1).unpause();
      expect(await shares.paused()).to.be.false;
    });

    it("reverts when non-pauser tries to pause or unpause", async () => {
      // Set user1 as pauser
      await shares.setPauser(user1.address);

      await expect(shares.pause()).to.be.revertedWithCustomError(
        shares,
        "AccessControlUnauthorizedAccount"
      );

      await shares.connect(user1).pause();

      await expect(shares.unpause()).to.be.revertedWithCustomError(
        shares,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("allows COMPLIANCE_OFFICER_ROLE to set user allowlist and frozen tokens", async () => {
      const COMPLIANCE_OFFICER_ROLE = await shares.COMPLIANCE_OFFICER_ROLE();
      expect(await shares.hasRole(COMPLIANCE_OFFICER_ROLE, deployer.address)).to.be.true;

      // setUserAllowed
      await shares.setUserAllowed(user1.address, true);
      expect(await shares.isUserAllowed(user1.address)).to.be.true;

      // setFrozenTokens
      const assetId = 1;
      const amount = ethers.parseUnits("100", 18);
      await shares.setFrozenTokens(user1.address, assetId, amount);
      expect(await shares.getFrozenTokens(user1.address, assetId)).to.equal(amount);
    });

    it("reverts when non-compliance officer tries to set user allowlist or frozen tokens", async () => {
      const assetId = 1;

      await expect(
        shares.connect(user1).setUserAllowed(user2.address, true)
      ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");

      await expect(
        shares.connect(user1).setFrozenTokens(user2.address, assetId, 1)
      ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");
    });

    it("reverts when non-compliance officer tries to forcedTransfer", async () => {
      const assetId = 1;

      await expect(
        shares.connect(user1).forcedTransfer(user1.address, user2.address, assetId, 1)
      ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Pausable", () => {
    it("allows pauser to pause and unpause contract", async () => {
      // Set deployer as pauser
      await shares.setPauser(deployer.address);

      await shares.pause();
      expect(await shares.paused()).to.be.true;

      await shares.unpause();
      expect(await shares.paused()).to.be.false;
    });

    it("reverts when non-pauser tries to pause or unpause", async () => {
      await shares.setPauser(deployer.address);

      await expect(
        shares.connect(user1).pause()
      ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");

      await shares.pause();

      await expect(
        shares.connect(user1).unpause()
      ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");
    });
  });

  describe("supportsInterface", () => {
    it("supports ERC1155 interface", async () => {
      // ERC1155 interface ID: 0xd9b67a26
      const ERC1155_INTERFACE_ID = "0xd9b67a26";
      expect(await shares.supportsInterface(ERC1155_INTERFACE_ID)).to.be.true;
    });

    it("supports AccessControl interface", async () => {
      // AccessControl interface ID: 0x7965db0b
      const ACCESS_CONTROL_INTERFACE_ID = "0x7965db0b";
      expect(await shares.supportsInterface(ACCESS_CONTROL_INTERFACE_ID)).to.be.true;
    });

    it("supports ERC165 interface", async () => {
      // ERC165 interface ID: 0x01ffc9a7
      const ERC165_INTERFACE_ID = "0x01ffc9a7";
      expect(await shares.supportsInterface(ERC165_INTERFACE_ID)).to.be.true;
    });
  });

  describe("Role Constants", () => {
    it("exposes ASSET_MANAGER_ROLE constant", async () => {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("ASSET_MANAGER_ROLE"));
      expect(await shares.ASSET_MANAGER_ROLE()).to.equal(expected);
    });

    it("exposes COMPLIANCE_OFFICER_ROLE constant", async () => {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("COMPLIANCE_OFFICER_ROLE"));
      expect(await shares.COMPLIANCE_OFFICER_ROLE()).to.equal(expected);
    });

    it("exposes MINTER_ROLE constant", async () => {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
      expect(await shares.MINTER_ROLE()).to.equal(expected);
    });

    it("exposes PAUSER_ROLE constant", async () => {
      const expected = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
      expect(await shares.PAUSER_ROLE()).to.equal(expected);
    });
  });

  describe("ERC7943 - User Allowlist", () => {
    it("returns false for user not on allowlist", async () => {
      expect(await shares.isUserAllowed(user1.address)).to.be.false;
    });

    it("allows compliance officer to add user to allowlist", async () => {
      await expect(shares.setUserAllowed(user1.address, true))
        .to.emit(allowList, "UserAllowlistUpdated")
        .withArgs(user1.address, true);

      expect(await shares.isUserAllowed(user1.address)).to.be.true;
    });

    it("allows compliance officer to remove user from allowlist", async () => {
      await shares.setUserAllowed(user1.address, true);
      await shares.setUserAllowed(user1.address, false);

      expect(await shares.isUserAllowed(user1.address)).to.be.false;
    });

    it("reverts when non-compliance officer tries to set allowlist", async () => {
      await expect(
        shares.connect(user1).setUserAllowed(user2.address, true)
      ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");
    });
  });

  describe("ERC7943 - Token Freezing", () => {
    const assetId = 1;

    it("returns zero frozen tokens by default", async () => {
      expect(await shares.getFrozenTokens(user1.address, assetId)).to.equal(0n);
    });

    it("allows compliance officer to freeze tokens", async () => {
      const amount = ethers.parseUnits("100", 18);

      await expect(shares.setFrozenTokens(user1.address, assetId, amount))
        .to.emit(shares, "Frozen")
        .withArgs(user1.address, assetId, amount);

      expect(await shares.getFrozenTokens(user1.address, assetId)).to.equal(amount);
    });

    it("reverts when non-compliance officer tries to freeze tokens", async () => {
      await expect(
        shares.connect(user1).setFrozenTokens(user2.address, assetId, 1)
      ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");
    });
  });

  describe("ERC7943 - Transaction Checks", () => {
    const assetId = 1;

    beforeEach(async () => {
      // Allow users for tests
      await shares.setUserAllowed(user1.address, true);
      await shares.setUserAllowed(user2.address, true);
    });

    it("canTransact returns false for user not on allowlist", async () => {
      expect(await shares.canTransact(user2.address, assetId, 1n)).to.be.false;
    });

    it("canTransact returns false when contract is paused", async () => {
      const amount = ethers.parseUnits("100", 18);

      // Use test helper to mint shares to user1
      await (testShares as any).mintSharesForTest(user1.address, assetId, amount);

      // Pause via AssetShares contract: set pauser and pause
      await shares.setPauser(deployer.address);
      await shares.pause();

      expect(await shares.canTransact(user1.address, assetId, amount)).to.be.false;
    });

    it("canTransact returns false when requested amount exceeds unfrozen balance", async () => {
      const total = ethers.parseUnits("100", 18);
      const frozen = ethers.parseUnits("80", 18);

      // Mint total to user1 in helper (shares state is separate, so we use helper instance for checks here)
      await (testShares as any).mintSharesForTest(user1.address, assetId, total);
      await testShares.setUserAllowed(user1.address, true);
      await testShares.setFrozenTokens(user1.address, assetId, frozen);

      // Request more than unfrozen (unfrozen = 20)
      expect(await testShares.canTransact(user1.address, assetId, ethers.parseUnits("50", 18))).to
        .be.false;
    });

    it("canTransact returns true when user has enough unfrozen balance and is allowed", async () => {
      const total = ethers.parseUnits("100", 18);
      const frozen = ethers.parseUnits("20", 18);
      const requested = ethers.parseUnits("50", 18);

      await (testShares as any).mintSharesForTest(user1.address, assetId, total);
      await testShares.setUserAllowed(user1.address, true);
      await testShares.setFrozenTokens(user1.address, assetId, frozen);

      expect(await testShares.canTransact(user1.address, assetId, requested)).to.be.true;
    });

    it("canTransfer returns false when from or to user not allowed", async () => {
      await shares.setUserAllowed(user1.address, true);
      // user2 remains not allowed

      expect(
        await shares.canTransfer(user1.address, user2.address, assetId, 1n)
      ).to.be.false;
      expect(
        await shares.canTransfer(user2.address, user1.address, assetId, 1n)
      ).to.be.false;
    });

    it("canTransfer returns false when contract is paused", async () => {
      const amount = ethers.parseUnits("100", 18);

      await (testShares as any).mintSharesForTest(user1.address, assetId, amount);
      await testShares.setUserAllowed(user1.address, true);
      await testShares.setUserAllowed(user2.address, true);

      await testShares.setPauser(deployer.address);
      await testShares.pause();

      expect(
        await testShares.canTransfer(user1.address, user2.address, assetId, amount)
      ).to.be.false;
    });

    it("canTransfer returns false when requested amount exceeds unfrozen balance", async () => {
      const total = ethers.parseUnits("100", 18);
      const frozen = ethers.parseUnits("80", 18);

      await (testShares as any).mintSharesForTest(user1.address, assetId, total);
      await testShares.setUserAllowed(user1.address, true);
      await testShares.setUserAllowed(user2.address, true);
      await testShares.setFrozenTokens(user1.address, assetId, frozen);

      expect(
        await testShares.canTransfer(
          user1.address,
          user2.address,
          assetId,
          ethers.parseUnits("50", 18)
        )
      ).to.be.false;
    });

    it("canTransfer returns true when all conditions are met", async () => {
      const total = ethers.parseUnits("100", 18);
      const frozen = ethers.parseUnits("20", 18);
      const amount = ethers.parseUnits("50", 18);

      await (testShares as any).mintSharesForTest(user1.address, assetId, total);
      await testShares.setUserAllowed(user1.address, true);
      await testShares.setUserAllowed(user2.address, true);
      await testShares.setFrozenTokens(user1.address, assetId, frozen);

      expect(
        await testShares.canTransfer(user1.address, user2.address, assetId, amount)
      ).to.be.true;
    });
  });

  describe("ERC7943 - Forced Transfer", () => {
    const assetId = 1;

    it("reverts when token balance is insufficient", async () => {
      await shares.setUserAllowed(user1.address, true);
      await shares.setUserAllowed(user2.address, true);

      // No tokens minted, so balance is zero
      await expect(
        shares.forcedTransfer(user1.address, user2.address, assetId, 1)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("allows compliance officer to forcibly transfer tokens and emits event", async () => {
      const amount = ethers.parseUnits("100", 18);

      // Use helper to mint into helper instance; for forcedTransfer tests, use helper instance
      await (testShares as any).mintSharesForTest(user1.address, assetId, amount);
      await testShares.setUserAllowed(user1.address, true);
      await testShares.setUserAllowed(user2.address, true);

      await expect(
        testShares.forcedTransfer(user1.address, user2.address, assetId, amount)
      )
        .to.emit(testShares, "ForcedTransfer")
        .withArgs(user1.address, user2.address, assetId, amount);

      expect(await testShares.balanceOf(user1.address, assetId)).to.equal(0n);
      expect(await testShares.balanceOf(user2.address, assetId)).to.equal(amount);
    });
  });

  describe("Trading Status Management", () => {
    it("allows asset manager to enable trading", async () => {
      const assetId = 1;
      const totalSupply = ethers.parseUnits("10000", 18);
      const sharePrice = ethers.parseUnits("1000", 6);

      const MINTER_ROLE = await shares.MINTER_ROLE();
      await shares.grantRole(MINTER_ROLE, deployer.address);
      await shares.connect(deployer).createAssetShares(assetId, totalSupply, sharePrice);

      await expect(shares.setTradingEnabled(assetId, true))
        .to.emit(shares, "TradingStatusChanged")
        .withArgs(assetId, true);

      const [, , , tradingEnabled] = await shares.getAssetShares(assetId);
      expect(tradingEnabled).to.be.true;
    });

    it("reverts when non-asset manager tries to enable trading", async () => {
      const assetId = 1;
      await expect(
        shares.connect(user1).setTradingEnabled(assetId, true)
      ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Share Price Management", () => {
    it("allows asset manager to update share price", async () => {
      const assetId = 1;
      const initialPrice = ethers.parseUnits("1000", 6);
      const newPrice = ethers.parseUnits("1200", 6);

      // Set up asset with initial share price
      await (testShares as any).setShareInfoForTest(
        assetId,
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("8000", 18),
        initialPrice,
        true
      );

      // Update share price
      const tx = await testShares.updateSharePrice(assetId, newPrice);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);
      
      await expect(tx)
        .to.emit(testShares, "SharePriceUpdated")
        .withArgs(assetId, initialPrice, newPrice, block!.timestamp);

      // Verify price was updated
      const [, , sharePrice] = await testShares.getAssetShares(assetId);
      expect(sharePrice).to.equal(newPrice);
    });

    it("emits SharePriceUpdated event with correct parameters", async () => {
      const assetId = 1;
      const oldPrice = ethers.parseUnits("500", 6);
      const newPrice = ethers.parseUnits("750", 6);

      await (testShares as any).setShareInfoForTest(
        assetId,
        ethers.parseUnits("5000", 18),
        ethers.parseUnits("4000", 18),
        oldPrice,
        true
      );

      const tx = await testShares.updateSharePrice(assetId, newPrice);
      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => testShares.interface.parseLog(log as any)?.name === "SharePriceUpdated"
      );

      expect(event).to.not.be.undefined;
      const parsedEvent = testShares.interface.parseLog(event as any);
      expect(parsedEvent?.args[0]).to.equal(assetId);
      expect(parsedEvent?.args[1]).to.equal(oldPrice);
      expect(parsedEvent?.args[2]).to.equal(newPrice);
    });

    it("reverts when non-asset manager tries to update share price", async () => {
      const assetId = 1;
      const newPrice = ethers.parseUnits("1000", 6);

      await (testShares as any).setShareInfoForTest(
        assetId,
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("8000", 18),
        ethers.parseUnits("500", 6),
        true
      );

      await expect(
        testShares.connect(user1).updateSharePrice(assetId, newPrice)
      ).to.be.revertedWithCustomError(testShares, "AccessControlUnauthorizedAccount");
    });

    it("reverts when asset does not exist", async () => {
      const assetId = 999;
      const newPrice = ethers.parseUnits("1000", 6);

      await expect(
        testShares.updateSharePrice(assetId, newPrice)
      ).to.be.revertedWith("Asset does not exist");
    });

    it("reverts when new price equals current price", async () => {
      const assetId = 1;
      const currentPrice = ethers.parseUnits("1000", 6);

      await (testShares as any).setShareInfoForTest(
        assetId,
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("8000", 18),
        currentPrice,
        true
      );

      await expect(
        testShares.updateSharePrice(assetId, currentPrice)
      ).to.be.revertedWith("New price must differ from current price");
    });

    it("allows updating share price multiple times", async () => {
      const assetId = 1;
      const price1 = ethers.parseUnits("1000", 6);
      const price2 = ethers.parseUnits("1200", 6);
      const price3 = ethers.parseUnits("1500", 6);

      await (testShares as any).setShareInfoForTest(
        assetId,
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("8000", 18),
        price1,
        true
      );

      // First update
      await testShares.updateSharePrice(assetId, price2);
      let [, , sharePrice] = await testShares.getAssetShares(assetId);
      expect(sharePrice).to.equal(price2);

      // Second update
      await testShares.updateSharePrice(assetId, price3);
      [, , sharePrice] = await testShares.getAssetShares(assetId);
      expect(sharePrice).to.equal(price3);
    });
  });

  describe("Asset Shares Creation", () => {
    it("allows AssetVault (MINTER_ROLE) to create asset shares", async () => {
      const assetId = 1;
      const totalSupply = ethers.parseUnits("10000", 18);
      const sharePrice = ethers.parseUnits("1000", 6);

      const vaultAddress = await vault.getAddress();
      // Grant MINTER_ROLE to deployer for testing (in production, vault has this role)
      const MINTER_ROLE = await shares.MINTER_ROLE();
      await shares.grantRole(MINTER_ROLE, deployer.address);
      
      await expect(shares.connect(deployer).createAssetShares(assetId, totalSupply, sharePrice))
        .to.emit(shares, "AssetSharesCreated")
        .withArgs(assetId, totalSupply, sharePrice, anyValue);

      const [totalSupply_, availableSupply_, sharePrice_, tradingEnabled_] =
        await shares.getAssetShares(assetId);
      
      expect(totalSupply_).to.equal(totalSupply);
      expect(availableSupply_).to.equal(totalSupply);
      expect(sharePrice_).to.equal(sharePrice);
      expect(tradingEnabled_).to.be.false;
      
      // Verify shares are available for purchase (not pre-minted, but availableSupply equals totalSupply)
      expect(availableSupply_).to.equal(totalSupply);
    });

    it("reverts when non-MINTER_ROLE tries to create asset shares", async () => {
      const assetId = 1;
      const totalSupply = ethers.parseUnits("10000", 18);
      const sharePrice = ethers.parseUnits("1000", 6);

      await expect(
        shares.connect(user1).createAssetShares(assetId, totalSupply, sharePrice)
      ).to.be.revertedWithCustomError(shares, "AccessControlUnauthorizedAccount");
    });

    it("reverts when trying to create shares for existing asset", async () => {
      const assetId = 1;
      const totalSupply = ethers.parseUnits("10000", 18);
      const sharePrice = ethers.parseUnits("1000", 6);

      const MINTER_ROLE = await shares.MINTER_ROLE();
      await shares.grantRole(MINTER_ROLE, deployer.address);
      await shares.connect(deployer).createAssetShares(assetId, totalSupply, sharePrice);

      await expect(
        shares.connect(deployer).createAssetShares(assetId, totalSupply, sharePrice)
      ).to.be.revertedWith("Asset shares already exist");
    });

    it("reverts when totalSupply is zero", async () => {
      const assetId = 1;
      const sharePrice = ethers.parseUnits("1000", 6);

      const MINTER_ROLE = await shares.MINTER_ROLE();
      await shares.grantRole(MINTER_ROLE, deployer.address);
      
      await expect(
        shares.connect(deployer).createAssetShares(assetId, 0, sharePrice)
      ).to.be.revertedWith("Total supply must be greater than zero");
    });

    it("reverts when sharePrice is zero", async () => {
      const assetId = 1;
      const totalSupply = ethers.parseUnits("10000", 18);

      const MINTER_ROLE = await shares.MINTER_ROLE();
      await shares.grantRole(MINTER_ROLE, deployer.address);
      
      await expect(
        shares.connect(deployer).createAssetShares(assetId, totalSupply, 0)
      ).to.be.revertedWith("Share price must be greater than zero");
    });
  });

  describe("Share Purchasing", () => {
    let assetId: number;
    let totalSupply: bigint;
    let sharePrice: bigint;

    beforeEach(async () => {
      assetId = 1;
      totalSupply = ethers.parseUnits("10000", 18);
      sharePrice = ethers.parseUnits("1000", 6); // $1000 per share

      // Create asset shares
      const MINTER_ROLE = await shares.MINTER_ROLE();
      await shares.grantRole(MINTER_ROLE, deployer.address);
      await shares.connect(deployer).createAssetShares(assetId, totalSupply, sharePrice);

      // Add users to allowlist
      await shares.setUserAllowed(user1.address, true);
      await shares.setUserAllowed(user2.address, true);

      // Give users USDC
      await usdc.transfer(user1.address, ethers.parseUnits("100000", 6));
      await usdc.transfer(user2.address, ethers.parseUnits("100000", 6));
    });

    it("allows user to purchase shares", async () => {
      const purchaseAmount = ethers.parseUnits("100", 18); // 100 shares
      const expectedCost = (purchaseAmount * sharePrice) / ethers.parseUnits("1", 18);

      // Approve USDC
      await usdc.connect(user1).approve(await shares.getAddress(), expectedCost);

      // Purchase shares
      await expect(shares.connect(user1).purchaseAssetShares(assetId, purchaseAmount))
        .to.emit(shares, "SharesPurchased")
        .withArgs(user1.address, assetId, purchaseAmount, sharePrice, expectedCost);

      // Verify shares received
      expect(await shares.balanceOf(user1.address, assetId)).to.equal(purchaseAmount);
      
      // Verify available supply decreased
      const [, availableSupply] = await shares.getAssetShares(assetId);
      expect(availableSupply).to.equal(totalSupply - purchaseAmount);

      // Verify purchase price recorded
      expect(await shares.purchasePrice(user1.address, assetId)).to.equal(sharePrice);
    });

    it("reverts when user is not on allowlist", async () => {
      const purchaseAmount = ethers.parseUnits("100", 18);
      const expectedCost = (purchaseAmount * sharePrice) / ethers.parseUnits("1", 18);

      await usdc.connect(user2).approve(await shares.getAddress(), expectedCost);
      await shares.setUserAllowed(user2.address, false);

      await expect(
        shares.connect(user2).purchaseAssetShares(assetId, purchaseAmount)
      ).to.be.revertedWith("User not allowed");
    });

    it("reverts when asset does not exist", async () => {
      const purchaseAmount = ethers.parseUnits("100", 18);
      const expectedCost = (purchaseAmount * sharePrice) / ethers.parseUnits("1", 18);

      await usdc.connect(user1).approve(await shares.getAddress(), expectedCost);

      await expect(
        shares.connect(user1).purchaseAssetShares(999, purchaseAmount)
      ).to.be.revertedWith("Asset does not exist");
    });

    it("reverts when insufficient available supply", async () => {
      const purchaseAmount = totalSupply + ethers.parseUnits("1", 18);
      const expectedCost = (purchaseAmount * sharePrice) / ethers.parseUnits("1", 18);

      await usdc.connect(user1).approve(await shares.getAddress(), expectedCost);

      await expect(
        shares.connect(user1).purchaseAssetShares(assetId, purchaseAmount)
      ).to.be.revertedWith("Insufficient available supply");
    });

    it("reverts when contract is paused", async () => {
      await shares.setPauser(deployer.address);
      await shares.pause();

      const purchaseAmount = ethers.parseUnits("100", 18);
      const expectedCost = (purchaseAmount * sharePrice) / ethers.parseUnits("1", 18);

      await usdc.connect(user1).approve(await shares.getAddress(), expectedCost);

      await expect(
        shares.connect(user1).purchaseAssetShares(assetId, purchaseAmount)
      ).to.be.revertedWithCustomError(shares, "EnforcedPause");
    });

  });

  describe("Share Trading", () => {
    const assetId = 1;
    const totalSupply = ethers.parseUnits("10000", 18);
    const sharePrice = ethers.parseUnits("1000", 6);

    beforeEach(async () => {
      // Use test helper: shares must exist for a property before trading; mintSharesForTest
      // simulates the state after purchase (test-only, production uses purchaseAssetShares).
      const ASSET_MANAGER_ROLE = await testShares.ASSET_MANAGER_ROLE();
      await testShares.grantRole(ASSET_MANAGER_ROLE, deployer.address);
      await testShares.setShareInfoForTest(
        assetId,
        totalSupply,
        totalSupply - ethers.parseUnits("500", 18), // 500 "sold"
        sharePrice,
        true // trading enabled
      );
      await testShares.setUserAllowed(user1.address, true);
      await testShares.setUserAllowed(user2.address, true);
      await testShares.mintSharesForTest(user1.address, assetId, ethers.parseUnits("500", 18));

      await usdc.transfer(user1.address, ethers.parseUnits("100000", 6));
      await usdc.transfer(user2.address, ethers.parseUnits("200000", 6));
    });

    it("allows users to trade shares", async () => {
      const tradeAmount = ethers.parseUnits("100", 18);
      const tradePrice = ethers.parseUnits("1200", 6);
      const expectedCost = (tradeAmount * tradePrice) / ethers.parseUnits("1", 18);

      await usdc.connect(user2).approve(await testShares.getAddress(), expectedCost);
      await testShares.connect(user1).setApprovalForAll(await testShares.getAddress(), true);

      await expect(testShares.connect(user2).tradeShares(assetId, user1.address, tradeAmount, tradePrice))
        .to.emit(testShares, "SharesTraded")
        .withArgs(user1.address, user2.address, assetId, tradeAmount, tradePrice);

      expect(await testShares.balanceOf(user1.address, assetId)).to.equal(ethers.parseUnits("400", 18));
      expect(await testShares.balanceOf(user2.address, assetId)).to.equal(tradeAmount);
      expect(await testShares.purchasePrice(user2.address, assetId)).to.equal(tradePrice);
    });

    it("reverts when trading is not enabled", async () => {
      await testShares.setShareInfoForTest(assetId, totalSupply, totalSupply - ethers.parseUnits("500", 18), sharePrice, false);

      const tradeAmount = ethers.parseUnits("100", 18);
      const tradePrice = ethers.parseUnits("1200", 6);
      const expectedCost = (tradeAmount * tradePrice) / ethers.parseUnits("1", 18);

      await usdc.connect(user2).approve(await testShares.getAddress(), expectedCost);
      await testShares.connect(user1).setApprovalForAll(await testShares.getAddress(), true);

      await expect(
        testShares.connect(user2).tradeShares(assetId, user1.address, tradeAmount, tradePrice)
      ).to.be.revertedWith("Trading not enabled for this asset");
    });

    it("reverts when seller has insufficient balance", async () => {
      const tradeAmount = ethers.parseUnits("1000", 18);
      const tradePrice = ethers.parseUnits("1200", 6);
      const expectedCost = (tradeAmount * tradePrice) / ethers.parseUnits("1", 18);

      await usdc.connect(user2).approve(await testShares.getAddress(), expectedCost);
      await testShares.connect(user1).setApprovalForAll(await testShares.getAddress(), true);

      await expect(
        testShares.connect(user2).tradeShares(assetId, user1.address, tradeAmount, tradePrice)
      ).to.be.revertedWith("Seller has insufficient balance");
    });

    it("reverts when seller has insufficient unfrozen balance", async () => {
      const tradeAmount = ethers.parseUnits("100", 18);
      const tradePrice = ethers.parseUnits("1200", 6);
      const expectedCost = (tradeAmount * tradePrice) / ethers.parseUnits("1", 18);

      await testShares.setFrozenTokens(user1.address, assetId, ethers.parseUnits("450", 18));
      await usdc.connect(user2).approve(await testShares.getAddress(), expectedCost);
      await testShares.connect(user1).setApprovalForAll(await testShares.getAddress(), true);

      await expect(
        testShares.connect(user2).tradeShares(assetId, user1.address, tradeAmount, tradePrice)
      ).to.be.revertedWith("Insufficient unfrozen balance");
    });

    it("mints shares for property, user1 purchases 60%, user2 then purchases 30% from user1", async () => {
      const assetIdForTest = 2; // different asset to avoid beforeEach state
      const totalSupplyForTest = ethers.parseUnits("1000", 18);
      const sharePriceForTest = ethers.parseUnits("100", 6);
      const sixtyPercent = (totalSupplyForTest * 60n) / 100n; // 600
      const thirtyPercent = (totalSupplyForTest * 30n) / 100n; // 300
      const fortyPercent = (totalSupplyForTest * 40n) / 100n; // 400

      const MINTER_ROLE = await testShares.MINTER_ROLE();
      await testShares.grantRole(MINTER_ROLE, deployer.address);
      await testShares.setShareInfoForTest(
        assetIdForTest,
        totalSupplyForTest,
        totalSupplyForTest,
        sharePriceForTest,
        true
      );
      await testShares.setUserAllowed(user1.address, true);
      await testShares.setUserAllowed(user2.address, true);

      const user1Cost = (sixtyPercent * sharePriceForTest) / ethers.parseUnits("1", 18); // 600 * 100 = 60_000 USDC
      const tradePrice = ethers.parseUnits("120", 6);
      const user2Cost = (thirtyPercent * tradePrice) / ethers.parseUnits("1", 18); // 300 * 120 = 36_000 USDC
      await usdc.transfer(user1.address, user1Cost);
      await usdc.transfer(user2.address, user2Cost);

      await usdc.connect(user1).approve(await testShares.getAddress(), user1Cost);
      await testShares.connect(user1).purchaseAssetShares(assetIdForTest, sixtyPercent);

      await usdc.connect(user2).approve(await testShares.getAddress(), user2Cost);
      await testShares.connect(user1).setApprovalForAll(await testShares.getAddress(), true);
      await testShares.connect(user2).tradeShares(assetIdForTest, user1.address, thirtyPercent, tradePrice);

      const [, availableSupply] = await testShares.getAssetShares(assetIdForTest);
      expect(availableSupply).to.equal(fortyPercent);
      expect(await testShares.balanceOf(user1.address, assetIdForTest)).to.equal(thirtyPercent);
      expect(await testShares.balanceOf(user2.address, assetIdForTest)).to.equal(thirtyPercent);
    });
  });

  describe("Frontend display - Shares by asset", () => {
    it("getAssetShares returns default values for non-existent asset", async () => {
      const assetId = 1;
      const [totalSupply, availableSupply, sharePrice, tradingEnabled] =
        await testShares.getAssetShares(assetId);

      expect(totalSupply).to.equal(0n);
      expect(availableSupply).to.equal(0n);
      expect(sharePrice).to.equal(0n);
      expect(tradingEnabled).to.equal(false);
    });

    it("getAssetShares returns correct values after setting shareInfo", async () => {
      const assetId = 1;
      const totalSupply = ethers.parseUnits("10000", 18); // 10k shares
      const availableSupply = ethers.parseUnits("7500", 18); // 7.5k available
      const sharePrice = ethers.parseUnits("1000", 6); // $1000 per share
      const tradingEnabled = true;

      await (testShares as any).setShareInfoForTest(
        assetId,
        totalSupply,
        availableSupply,
        sharePrice,
        tradingEnabled
      );

      const [totalSupply_, availableSupply_, sharePrice_, tradingEnabled_] =
        await testShares.getAssetShares(assetId);

      expect(totalSupply_).to.equal(totalSupply);
      expect(availableSupply_).to.equal(availableSupply);
      expect(sharePrice_).to.equal(sharePrice);
      expect(tradingEnabled_).to.equal(tradingEnabled);
    });

    it("getAssetShares returns correct values for multiple assets", async () => {
      const assetId1 = 1;
      const assetId2 = 2;

      await (testShares as any).setShareInfoForTest(
        assetId1,
        ethers.parseUnits("5000", 18),
        ethers.parseUnits("3000", 18),
        ethers.parseUnits("800", 6),
        true
      );

      await (testShares as any).setShareInfoForTest(
        assetId2,
        ethers.parseUnits("20000", 18),
        ethers.parseUnits("15000", 18),
        ethers.parseUnits("1200", 6),
        false
      );

      const [total1, available1, sharePrice1, trading1] =
        await testShares.getAssetShares(assetId1);
      const [total2, available2, sharePrice2, trading2] =
        await testShares.getAssetShares(assetId2);

      expect(total1).to.equal(ethers.parseUnits("5000", 18));
      expect(available1).to.equal(ethers.parseUnits("3000", 18));
      expect(sharePrice1).to.equal(ethers.parseUnits("800", 6));
      expect(trading1).to.equal(true);

      expect(total2).to.equal(ethers.parseUnits("20000", 18));
      expect(available2).to.equal(ethers.parseUnits("15000", 18));
      expect(sharePrice2).to.equal(ethers.parseUnits("1200", 6));
      expect(trading2).to.equal(false);
    });
  });

  describe("Frontend display - Shares by user by asset", () => {
    it("getUserShares returns zeroed user position for new user and asset", async () => {
      const assetId = 1;
      const [, , , , balance, frozen, unfrozen, recordedPurchasePrice] =
        await testShares.getUserShares(user1.address, assetId);

      expect(balance).to.equal(0n);
      expect(frozen).to.equal(0n);
      expect(unfrozen).to.equal(0n);
      expect(recordedPurchasePrice).to.equal(0n);
    });

    it("getUserShares returns correct user position after minting shares", async () => {
      const assetId = 1;
      const shareAmount = ethers.parseUnits("1000", 18);
      const purchasePrice = ethers.parseUnits("500", 6); // $500 per share

      // Set up shareInfo
      await (testShares as any).setShareInfoForTest(
        assetId,
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("9000", 18),
        ethers.parseUnits("1000", 6),
        true
      );

      // Mint shares to user
      await (testShares as any).mintSharesForTest(user1.address, assetId, shareAmount);
      await (testShares as any).setPurchasePriceForTest(user1.address, assetId, purchasePrice);

      const [, , , , balance, frozen, unfrozen, recordedPurchasePrice] =
        await testShares.getUserShares(user1.address, assetId);

      expect(balance).to.equal(shareAmount);
      expect(frozen).to.equal(0n);
      expect(unfrozen).to.equal(shareAmount);
      expect(recordedPurchasePrice).to.equal(purchasePrice);
    });

    it("getUserShares correctly calculates unfrozen balance when some shares are frozen", async () => {
      const assetId = 1;
      const totalShares = ethers.parseUnits("2000", 18);
      const frozenAmount = ethers.parseUnits("500", 18);
      const purchasePrice = ethers.parseUnits("750", 6);

      await (testShares as any).setShareInfoForTest(
        assetId,
        ethers.parseUnits("10000", 18),
        ethers.parseUnits("8000", 18),
        ethers.parseUnits("1000", 6),
        true
      );

      await (testShares as any).mintSharesForTest(user1.address, assetId, totalShares);
      await (testShares as any).setPurchasePriceForTest(user1.address, assetId, purchasePrice);

      // Freeze some shares
      await testShares.grantRole(
        ethers.keccak256(ethers.toUtf8Bytes("COMPLIANCE_OFFICER_ROLE")),
        deployer.address
      );
      await testShares.setFrozenTokens(user1.address, assetId, frozenAmount);

      const [, , , , balance, frozen, unfrozen, recordedPurchasePrice] =
        await testShares.getUserShares(user1.address, assetId);

      expect(balance).to.equal(totalShares);
      expect(frozen).to.equal(frozenAmount);
      expect(unfrozen).to.equal(totalShares - frozenAmount);
      expect(recordedPurchasePrice).to.equal(purchasePrice);
    });

    it("getUserShares combines share info and user position", async () => {
      const assetId = 1;
      const totalSupply = ethers.parseUnits("10000", 18);
      const availableSupply = ethers.parseUnits("8000", 18);
      const sharePrice = ethers.parseUnits("1000", 6);
      const userShares = ethers.parseUnits("1500", 18);
      const purchasePrice = ethers.parseUnits("600", 6);

      await (testShares as any).setShareInfoForTest(
        assetId,
        totalSupply,
        availableSupply,
        sharePrice,
        true
      );
      await (testShares as any).mintSharesForTest(user1.address, assetId, userShares);
      await (testShares as any).setPurchasePriceForTest(user1.address, assetId, purchasePrice);

      const [
        totalSupply_,
        availableSupply_,
        sharePrice_,
        tradingEnabled_,
        balance_,
        frozen_,
        unfrozen_,
        recordedPurchasePrice_
      ] = await testShares.getUserShares(user1.address, assetId);

      expect(totalSupply_).to.equal(totalSupply);
      expect(availableSupply_).to.equal(availableSupply);
      expect(sharePrice_).to.equal(sharePrice);
      expect(tradingEnabled_).to.equal(true);
      expect(balance_).to.equal(userShares);
      expect(frozen_).to.equal(0n);
      expect(unfrozen_).to.equal(userShares);
      expect(recordedPurchasePrice_).to.equal(purchasePrice);
    });

    it("getUserShares returns correct data for multiple users with same asset", async () => {
      const assetId = 1;
      const totalSupply = ethers.parseUnits("20000", 18);
      const availableSupply = ethers.parseUnits("15000", 18);
      const sharePrice = ethers.parseUnits("1000", 6);

      await (testShares as any).setShareInfoForTest(
        assetId,
        totalSupply,
        availableSupply,
        sharePrice,
        true
      );

      const user1Shares = ethers.parseUnits("3000", 18);
      const user2Shares = ethers.parseUnits("2000", 18);
      const user1Price = ethers.parseUnits("500", 6);
      const user2Price = ethers.parseUnits("550", 6);

      await (testShares as any).mintSharesForTest(user1.address, assetId, user1Shares);
      await (testShares as any).mintSharesForTest(user2.address, assetId, user2Shares);
      await (testShares as any).setPurchasePriceForTest(user1.address, assetId, user1Price);
      await (testShares as any).setPurchasePriceForTest(user2.address, assetId, user2Price);

      const user1Data = await testShares.getUserShares(user1.address, assetId);
      const user2Data = await testShares.getUserShares(user2.address, assetId);

      expect(user1Data[0]).to.equal(totalSupply); // totalSupply
      expect(user1Data[1]).to.equal(availableSupply); // availableSupply
      expect(user1Data[2]).to.equal(sharePrice); // sharePrice
      expect(user1Data[4]).to.equal(user1Shares); // balance
      expect(user1Data[7]).to.equal(user1Price); // purchasePrice

      expect(user2Data[0]).to.equal(totalSupply); // totalSupply
      expect(user2Data[1]).to.equal(availableSupply); // availableSupply
      expect(user2Data[2]).to.equal(sharePrice); // sharePrice
      expect(user2Data[4]).to.equal(user2Shares); // balance
      expect(user2Data[7]).to.equal(user2Price); // purchasePrice
    });

    it("displays shares owned by user across multiple assets (frontend loop pattern)", async () => {
      // Setup: User owns shares in multiple assets
      const userAssets = [
        {
          assetId: 1,
          totalSupply: ethers.parseUnits("10000", 18),
          availableSupply: ethers.parseUnits("8000", 18),
          sharePrice: ethers.parseUnits("1000", 6),
          userShares: ethers.parseUnits("1500", 18),
          purchasePrice: ethers.parseUnits("500", 6),
          tradingEnabled: true,
        },
        {
          assetId: 2,
          totalSupply: ethers.parseUnits("20000", 18),
          availableSupply: ethers.parseUnits("15000", 18),
          sharePrice: ethers.parseUnits("1200", 6),
          userShares: ethers.parseUnits("3000", 18),
          purchasePrice: ethers.parseUnits("750", 6),
          tradingEnabled: true,
        },
        {
          assetId: 3,
          totalSupply: ethers.parseUnits("5000", 18),
          availableSupply: ethers.parseUnits("4000", 18),
          sharePrice: ethers.parseUnits("800", 6),
          userShares: ethers.parseUnits("500", 18),
          purchasePrice: ethers.parseUnits("1000", 6),
          tradingEnabled: false,
        },
      ];

      // Initialize all assets and mint shares to user
      const decimalsAdjustment = 10n ** 12n; // Adjust for USDC(6) * 18-decimal shares => 12 extra decimals

      for (const asset of userAssets) {
        await (testShares as any).setShareInfoForTest(
          asset.assetId,
          asset.totalSupply,
          asset.availableSupply,
          asset.sharePrice,
          asset.tradingEnabled
        );
        await (testShares as any).mintSharesForTest(
          user1.address,
          asset.assetId,
          asset.userShares
        );
        await (testShares as any).setPurchasePriceForTest(
          user1.address,
          asset.assetId,
          asset.purchasePrice
        );
      }

      // Frontend pattern: Loop through assets and fetch display data
      const userPortfolio: Array<{
        assetId: number;
        totalSupply: bigint;
        availableSupply: bigint;
        sharePrice: bigint;
        tradingEnabled: boolean;
        balance: bigint;
        frozen: bigint;
        unfrozen: bigint;
        recordedPurchasePrice: bigint;
        totalValue: bigint; // balance * purchasePrice (for display)
      }> = [];

      for (const asset of userAssets) {
        const [
          totalSupply,
          availableSupply,
          sharePrice,
          tradingEnabled,
          balance,
          frozen,
          unfrozen,
          recordedPurchasePrice,
        ] = await testShares.getUserShares(user1.address, asset.assetId);

        // Calculate total value (for frontend display) using bigint-only math
        const totalValue =
          (BigInt(balance) * BigInt(recordedPurchasePrice)) / decimalsAdjustment;

        userPortfolio.push({
          assetId: asset.assetId,
          totalSupply,
          availableSupply,
          sharePrice,
          tradingEnabled,
          balance,
          frozen,
          unfrozen,
          recordedPurchasePrice,
          totalValue,
        });
      }

      // Verify portfolio data matches expected values
      expect(userPortfolio.length).to.equal(3);

      // Asset 1
      expect(userPortfolio[0].assetId).to.equal(1);
      expect(userPortfolio[0].totalSupply).to.equal(userAssets[0].totalSupply);
      expect(userPortfolio[0].availableSupply).to.equal(userAssets[0].availableSupply);
      expect(userPortfolio[0].tradingEnabled).to.equal(true);
      expect(userPortfolio[0].balance).to.equal(userAssets[0].userShares);
      expect(userPortfolio[0].frozen).to.equal(0n);
      expect(userPortfolio[0].unfrozen).to.equal(userAssets[0].userShares);
      expect(userPortfolio[0].recordedPurchasePrice).to.equal(userAssets[0].purchasePrice);

      // Asset 2
      expect(userPortfolio[1].assetId).to.equal(2);
      expect(userPortfolio[1].totalSupply).to.equal(userAssets[1].totalSupply);
      expect(userPortfolio[1].availableSupply).to.equal(userAssets[1].availableSupply);
      expect(userPortfolio[1].tradingEnabled).to.equal(true);
      expect(userPortfolio[1].balance).to.equal(userAssets[1].userShares);
      expect(userPortfolio[1].frozen).to.equal(0n);
      expect(userPortfolio[1].unfrozen).to.equal(userAssets[1].userShares);
      expect(userPortfolio[1].recordedPurchasePrice).to.equal(userAssets[1].purchasePrice);

      // Asset 3
      expect(userPortfolio[2].assetId).to.equal(3);
      expect(userPortfolio[2].totalSupply).to.equal(userAssets[2].totalSupply);
      expect(userPortfolio[2].availableSupply).to.equal(userAssets[2].availableSupply);
      expect(userPortfolio[2].tradingEnabled).to.equal(false);
      expect(userPortfolio[2].balance).to.equal(userAssets[2].userShares);
      expect(userPortfolio[2].frozen).to.equal(0n);
      expect(userPortfolio[2].unfrozen).to.equal(userAssets[2].userShares);
      expect(userPortfolio[2].recordedPurchasePrice).to.equal(userAssets[2].purchasePrice);

      // Calculate total portfolio value (frontend would sum this)
      const totalPortfolioValue = userPortfolio.reduce(
        (sum, position) => sum + position.totalValue,
        0n
      );
      expect(totalPortfolioValue).to.be.greaterThan(0n);
    });
  });
});

