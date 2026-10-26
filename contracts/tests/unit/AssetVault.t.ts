import { ethers } from "hardhat";
import { expect } from "chai";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("AssetVault", () => {
  let vault: any;
  let allowList: any;
  let deployer: any;
  let complianceOfficer: any;
  let user1: any;
  let user2: any;
  let user3: any;
  let mockShares: any;

  const ASSET_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ASSET_MANAGER_ROLE"));
  const COMPLIANCE_OFFICER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("COMPLIANCE_OFFICER_ROLE"));
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // OpenZeppelin uses 0x00 for DEFAULT_ADMIN_ROLE

  beforeEach(async () => {
    [deployer, , , complianceOfficer, user1, user2, user3] = await ethers.getSigners();

    const AssetUserAllowList = await ethers.getContractFactory("AssetUserAllowList");
    allowList = await AssetUserAllowList.deploy();
    await allowList.waitForDeployment();

    const AssetVault = await ethers.getContractFactory("AssetVault", deployer);
    vault = await AssetVault.deploy(await allowList.getAddress());
    await vault.waitForDeployment();

    await allowList.setAuthorizedCaller(await vault.getAddress(), true);

    // Grant COMPLIANCE_OFFICER_ROLE to complianceOfficer signer for testing
    await vault.grantRole(COMPLIANCE_OFFICER_ROLE, complianceOfficer.address);

    // Set pauser to deployer for testing (in production this would be a multisig)
    await (vault as any).setPauser(deployer.address);

    // Deploy mock AssetShares
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockShares = await MockERC20.deploy("Mock Shares", "MSH", 18, ethers.parseUnits("0", 18));
    await mockShares.waitForDeployment();
  });

  describe("Deployment", () => {
    it("deploys successfully with allowlist", async () => {
      expect(await vault.getAddress()).to.properAddress;
      expect(await vault.userAllowList()).to.equal(await allowList.getAddress());
    });

    it("reverts when the allowlist address is zero", async () => {
      const AssetVault = await ethers.getContractFactory("AssetVault");
      await expect(AssetVault.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "Invalid allowlist address"
      );
    });

    it("sets correct name and symbol", async () => {
      expect(await vault.name()).to.equal("Asset Vault");
      expect(await vault.symbol()).to.equal("VAULT");
    });

    it("grants DEFAULT_ADMIN_ROLE to deployer", async () => {
      expect(await vault.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
    });

    it("grants ASSET_MANAGER_ROLE to deployer", async () => {
      expect(await vault.hasRole(ASSET_MANAGER_ROLE, deployer.address)).to.be.true;
    });

    it("grants COMPLIANCE_OFFICER_ROLE to deployer", async () => {
      expect(await vault.hasRole(COMPLIANCE_OFFICER_ROLE, deployer.address)).to.be.true;
    });

    it("initializes with zero AssetShares address", async () => {
      expect(await vault.assetShares()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("setAssetShares", () => {
    it("allows admin to set AssetShares address", async () => {
      await (vault as any).setAssetShares(await mockShares.getAddress());
      expect(await vault.assetShares()).to.equal(await mockShares.getAddress());
    });

    it("emits AssetSharesSet event", async () => {
      await expect((vault as any).setAssetShares(await mockShares.getAddress()))
        .to.emit(vault, "AssetSharesSet")
        .withArgs(await mockShares.getAddress());
    });

    it("reverts when called by non-admin", async () => {
      await expect(
        vault.connect(user1).setAssetShares(await mockShares.getAddress())
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("reverts when setting zero address", async () => {
      await expect(
        (vault as any).setAssetShares(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid share token");
    });

    it("reverts when called twice", async () => {
      await (vault as any).setAssetShares(await mockShares.getAddress());
      await expect(
        (vault as any).setAssetShares(await mockShares.getAddress())
      ).to.be.revertedWith("AssetShares already set");
    });
  });

  describe("setPauser", () => {
    it("reverts when the pauser address is zero", async () => {
      const AssetVault = await ethers.getContractFactory("AssetVault");
      const fresh = await AssetVault.deploy(await allowList.getAddress());
      await expect(fresh.setPauser(ethers.ZeroAddress)).to.be.revertedWith("Invalid pauser address");
    });

    it("reverts when the pauser is already set", async () => {
      await expect(vault.setPauser(user1.address)).to.be.revertedWith("Pauser already set");
    });

    it("reverts when a non-admin sets the pauser", async () => {
      const AssetVault = await ethers.getContractFactory("AssetVault");
      const fresh = await AssetVault.deploy(await allowList.getAddress());
      await expect(fresh.connect(user1).setPauser(user1.address)).to.be.revertedWithCustomError(
        fresh,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Access Control", () => {
    it("allows admin to grant roles", async () => {
      await vault.grantRole(ASSET_MANAGER_ROLE, user1.address);
      expect(await vault.hasRole(ASSET_MANAGER_ROLE, user1.address)).to.be.true;
    });

    it("allows admin to revoke roles", async () => {
      await vault.grantRole(ASSET_MANAGER_ROLE, user1.address);
      await vault.revokeRole(ASSET_MANAGER_ROLE, user1.address);
      expect(await vault.hasRole(ASSET_MANAGER_ROLE, user1.address)).to.be.false;
    });

    it("reverts when non-admin tries to grant role", async () => {
      await expect(
        vault.connect(user1).grantRole(ASSET_MANAGER_ROLE, user2.address)
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });
  });

  describe("ERC7943 - User Allowlist", () => {
    it("returns false for user not on allowlist", async () => {
      expect(await vault.isUserAllowed(user1.address)).to.be.false;
    });

    it("allows compliance officer to add user to allowlist", async () => {
      await expect(vault.connect(complianceOfficer).setUserAllowed(user1.address, true))
        .to.emit(allowList, "UserAllowlistUpdated")
        .withArgs(user1.address, true);
      
      expect(await vault.isUserAllowed(user1.address)).to.be.true;
    });

    it("allows compliance officer to remove user from allowlist", async () => {
      await vault.connect(complianceOfficer).setUserAllowed(user1.address, true);
      await vault.connect(complianceOfficer).setUserAllowed(user1.address, false);
      
      expect(await vault.isUserAllowed(user1.address)).to.be.false;
    });

    it("reverts when non-compliance officer tries to set allowlist", async () => {
      await expect(
        vault.connect(user1).setUserAllowed(user2.address, true)
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });
  });

  describe("ERC7943 - Token Freezing", () => {
    let tokenVault: any;
    const tokenId = 1n;

    beforeEach(async () => {
      const AssetVaultTestHelper = await ethers.getContractFactory("AssetVaultTestHelper", deployer);
      tokenVault = await AssetVaultTestHelper.deploy(await allowList.getAddress());
      await tokenVault.waitForDeployment();
      await allowList.setAuthorizedCaller(await tokenVault.getAddress(), true);
      await tokenVault.grantRole(COMPLIANCE_OFFICER_ROLE, complianceOfficer.address);
      await tokenVault.setPauser(deployer.address);
      await tokenVault.mintForTest(user1.address, tokenId);
    });

    it("returns false for non-frozen token", async () => {
      expect(await tokenVault.isFrozen(tokenId)).to.be.false;
    });

    it("allows compliance officer to freeze token", async () => {
      await tokenVault.connect(complianceOfficer).setFrozenToken(tokenId, true);
      expect(await tokenVault.isFrozen(tokenId)).to.be.true;
    });

    it("reverts when non-compliance officer tries to freeze token", async () => {
      await expect(
        tokenVault.connect(user1).setFrozenToken(tokenId, true)
      ).to.be.revertedWithCustomError(tokenVault, "AccessControlUnauthorizedAccount");
    });

    it("reverts when trying to freeze non-existent token", async () => {
      await expect(
        tokenVault.connect(complianceOfficer).setFrozenToken(999, true)
      ).to.be.reverted;
    });

    it("emits Frozen event when token is frozen", async () => {
      await expect(tokenVault.connect(complianceOfficer).setFrozenToken(tokenId, true))
        .to.emit(tokenVault, "Frozen")
        .withArgs(user1.address, tokenId);
    });
  });

  describe("ERC7943 - Transaction Checks", () => {
    let tokenVault: any;
    const tokenId = 1n;

    beforeEach(async () => {
      const AssetVaultTestHelper = await ethers.getContractFactory("AssetVaultTestHelper", deployer);
      tokenVault = await AssetVaultTestHelper.deploy(await allowList.getAddress());
      await tokenVault.waitForDeployment();
      await allowList.setAuthorizedCaller(await tokenVault.getAddress(), true);
      await tokenVault.grantRole(COMPLIANCE_OFFICER_ROLE, complianceOfficer.address);
      await tokenVault.setPauser(deployer.address);
      await tokenVault.connect(complianceOfficer).setUserAllowed(user1.address, true);
      await tokenVault.connect(complianceOfficer).setUserAllowed(user2.address, true);
      await tokenVault.mintForTest(user1.address, tokenId);
    });

    it("canTransact returns false for user not on allowlist", async () => {
      expect(await tokenVault.canTransact(user3.address, tokenId)).to.be.false;
    });

    it("canTransact returns false when contract is paused", async () => {
      await tokenVault.pause();
      expect(await tokenVault.canTransact(user1.address, tokenId)).to.be.false;
    });

    it("canTransact returns false for frozen token", async () => {
      await tokenVault.connect(complianceOfficer).setFrozenToken(tokenId, true);
      expect(await tokenVault.canTransact(user1.address, tokenId)).to.be.false;
    });

    it("canTransact returns true when user owns token and conditions are met", async () => {
      expect(await tokenVault.canTransact(user1.address, tokenId)).to.be.true;
    });

    it("canTransact returns false when the user does not own the token", async () => {
      expect(await tokenVault.canTransact(user2.address, tokenId)).to.be.false;
    });

    it("canTransfer returns false when from user not allowed", async () => {
      expect(await tokenVault.canTransfer(user3.address, user1.address, tokenId)).to.be.false;
    });

    it("canTransfer returns false when to user not allowed", async () => {
      expect(await tokenVault.canTransfer(user1.address, user3.address, tokenId)).to.be.false;
    });

    it("canTransfer returns false when contract is paused", async () => {
      await tokenVault.pause();
      expect(await tokenVault.canTransfer(user1.address, user2.address, tokenId)).to.be.false;
    });

    it("canTransfer returns true when all conditions are met", async () => {
      expect(await tokenVault.canTransfer(user1.address, user2.address, tokenId)).to.be.true;
    });

    it("canTransfer returns false for frozen token", async () => {
      await tokenVault.connect(complianceOfficer).setFrozenToken(tokenId, true);
      expect(await tokenVault.canTransfer(user1.address, user2.address, tokenId)).to.be.false;
    });

    it("canTransfer returns false when from does not own the token", async () => {
      expect(await tokenVault.canTransfer(user2.address, user1.address, tokenId)).to.be.false;
    });
  });

  describe("ERC7943 - Forced Transfer", () => {
    let tokenVault: any;
    const tokenId = 1n;

    beforeEach(async () => {
      const AssetVaultTestHelper = await ethers.getContractFactory("AssetVaultTestHelper", deployer);
      tokenVault = await AssetVaultTestHelper.deploy(await allowList.getAddress());
      await tokenVault.waitForDeployment();
      await allowList.setAuthorizedCaller(await tokenVault.getAddress(), true);
      await tokenVault.grantRole(COMPLIANCE_OFFICER_ROLE, complianceOfficer.address);
      await tokenVault.setPauser(deployer.address);
      await tokenVault.mintForTest(user1.address, tokenId);
    });

    it("reverts when non-compliance officer tries forced transfer", async () => {
      await expect(
        tokenVault.connect(user1).forcedTransfer(user1.address, user2.address, tokenId)
      ).to.be.revertedWithCustomError(tokenVault, "AccessControlUnauthorizedAccount");
    });

    it("reverts when token not owned by from address", async () => {
      await expect(
        tokenVault.connect(complianceOfficer).forcedTransfer(user2.address, user1.address, tokenId)
      ).to.be.revertedWith("Token not owned by from");
    });

    it("reverts when called on non-existent token", async () => {
      await expect(
        tokenVault.connect(complianceOfficer).forcedTransfer(user1.address, user2.address, 999)
      ).to.be.reverted;
    });

    it("emits ForcedTransfer event when transfer succeeds", async () => {
      await expect(
        tokenVault.connect(complianceOfficer).forcedTransfer(user1.address, user2.address, tokenId)
      )
        .to.emit(tokenVault, "ForcedTransfer")
        .withArgs(user1.address, user2.address, tokenId);
      expect(await tokenVault.ownerOf(tokenId)).to.equal(user2.address);
    });

    it("reverts a forced transfer when the vault is paused", async () => {
      await tokenVault.pause();
      await expect(
        tokenVault.connect(complianceOfficer).forcedTransfer(user1.address, user2.address, tokenId)
      ).to.be.revertedWithCustomError(tokenVault, "EnforcedPause");
    });

    it("reverts when forcedTransfer is reentered", async () => {
      await tokenVault.grantRole(COMPLIANCE_OFFICER_ROLE, await tokenVault.getAddress());
      await tokenVault.setReenterHook(
        await tokenVault.getAddress(),
        tokenVault.interface.encodeFunctionData("forcedTransfer", [
          user1.address,
          user2.address,
          tokenId,
        ])
      );
      await expect(
        tokenVault.connect(complianceOfficer).forcedTransfer(user1.address, user2.address, tokenId)
      ).to.be.revertedWithCustomError(tokenVault, "ReentrancyGuardReentrantCall");
    });
  });

  describe("Pausable", () => {
    it("allows admin to pause contract", async () => {
      await vault.pause();
      expect(await vault.paused()).to.be.true;
    });

    it("allows admin to unpause contract", async () => {
      await vault.pause();
      await vault.unpause();
      expect(await vault.paused()).to.be.false;
    });

    it("reverts when non-admin tries to pause", async () => {
      await expect(
        vault.connect(user1).pause()
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });

    it("reverts when non-admin tries to unpause", async () => {
      await vault.pause();
      await expect(
        vault.connect(user1).unpause()
      ).to.be.revertedWithCustomError(vault, "AccessControlUnauthorizedAccount");
    });
  });

  describe("supportsInterface", () => {
    it("supports ERC721 interface", async () => {
      // ERC721 interface ID: 0x80ac58cd
      const ERC721_INTERFACE_ID = "0x80ac58cd";
      expect(await vault.supportsInterface(ERC721_INTERFACE_ID)).to.be.true;
    });

    it("supports AccessControl interface", async () => {
      // AccessControl interface ID: 0x7965db0b
      const ACCESS_CONTROL_INTERFACE_ID = "0x7965db0b";
      expect(await vault.supportsInterface(ACCESS_CONTROL_INTERFACE_ID)).to.be.true;
    });

    it("supports ERC165 interface", async () => {
      // ERC165 interface ID: 0x01ffc9a7
      const ERC165_INTERFACE_ID = "0x01ffc9a7";
      expect(await vault.supportsInterface(ERC165_INTERFACE_ID)).to.be.true;
    });

    it("returns false for an unsupported interface", async () => {
      expect(await vault.supportsInterface("0xffffffff")).to.be.false;
    });
  });

  describe("Role Constants", () => {
    it("exposes ASSET_MANAGER_ROLE constant", async () => {
      expect(await vault.ASSET_MANAGER_ROLE()).to.equal(ASSET_MANAGER_ROLE);
    });

    it("exposes COMPLIANCE_OFFICER_ROLE constant", async () => {
      expect(await vault.COMPLIANCE_OFFICER_ROLE()).to.equal(COMPLIANCE_OFFICER_ROLE);
    });

    it("exposes PAUSER_ROLE constant", async () => {
      expect(await vault.PAUSER_ROLE()).to.equal(ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE")));
    });
  });

  describe("Asset Vault creation and retrieval", () => {
    let testVault: any;

    beforeEach(async () => {
      const AssetUserAllowList = await ethers.getContractFactory("AssetUserAllowList");
      const testAllowList = await AssetUserAllowList.deploy();
      await testAllowList.waitForDeployment();

      const AssetVaultTestHelper = await ethers.getContractFactory("AssetVaultTestHelper", deployer);
      testVault = await AssetVaultTestHelper.deploy(await testAllowList.getAddress());
      await testVault.waitForDeployment();

      await testAllowList.setAuthorizedCaller(await testVault.getAddress(), true);
      await testVault.grantRole(COMPLIANCE_OFFICER_ROLE, complianceOfficer.address);
      await (testVault as any).setPauser(deployer.address);
    });

    it("createAsset assigns the next id and stores the record", async () => {
      const capitalValue = ethers.parseUnits("1000000", 6);
      const incomeValue = ethers.parseUnits("50000", 6);
      const metadataURI = "ipfs://QmCreateAsset1";

      const assetId = await testVault.createAsset.staticCall(0, capitalValue, incomeValue, metadataURI);
      await expect(testVault.createAsset(0, capitalValue, incomeValue, metadataURI))
        .to.emit(testVault, "AssetVaulted")
        .withArgs(assetId, 0, capitalValue, incomeValue, anyValue);

      const asset = await testVault.getAsset(assetId);
      expect(asset.status).to.equal(0);
      expect(asset.capitalValue).to.equal(capitalValue);
      expect(asset.incomeValue).to.equal(incomeValue);
      expect(asset.metadataURI).to.equal(metadataURI);
      expect(asset.createdAt).to.be.gt(0);
      expect(asset.updatedAt).to.equal(0);
    });

    it("reverts createAsset when metadataURI is already used", async () => {
      const metadataURI = "ipfs://QmDuplicate";
      await testVault.createAsset(0, 1, 1, metadataURI);
      await expect(testVault.createAsset(0, 2, 2, metadataURI)).to.be.revertedWith(
        "Asset already exists"
      );
    });

    it("reverts createAsset when caller is not an asset manager", async () => {
      await expect(
        testVault.connect(user1).createAsset(0, 1, 1, "ipfs://QmNoRole")
      ).to.be.revertedWithCustomError(testVault, "AccessControlUnauthorizedAccount");
    });

    it("getAllAssets returns records for the requested ids", async () => {
      await testVault.createAsset(0, 10, 1, "ipfs://QmA");
      await testVault.createAsset(1, 20, 2, "ipfs://QmB");

      const assets = await testVault.getAllAssets([1, 2]);
      expect(assets).to.have.lengthOf(2);
      expect(assets[0].capitalValue).to.equal(10n);
      expect(assets[1].capitalValue).to.equal(20n);
      expect(assets[1].status).to.equal(1);
    });

    it("getAllAssets returns an empty list when no ids are given", async () => {
      expect(await testVault.getAllAssets([])).to.deep.equal([]);
    });

    it("creates a property (asset) with core numeric fields and metadataURI set", async () => {
      const assetId = 1;
      const capitalValue = ethers.parseUnits("10000000", 6); // 10M
      const incomeValue = ethers.parseUnits("500000", 6); // 500k
      const metadataURI = "ipfs://QmPropertyMetadata123";

      await (testVault as any).setAssetForTest(
        assetId,
        0, // AssetStatus.Active
        capitalValue,
        incomeValue,
        metadataURI
      );

      const asset = await testVault.getAsset(assetId);

      // Core numeric struct fields (totalShares and sharePrice come from AssetShares contract)
      expect(asset.capitalValue).to.equal(capitalValue);
      expect(asset.incomeValue).to.equal(incomeValue);

      // Metadata (IPFS-backed)
      expect(asset.metadataURI).to.equal(metadataURI);
    });

    it("getAsset returns capitalValue and incomeValue after setAssetForTest", async () => {
      const capitalValue = ethers.parseUnits("500000", 6); // 500k USDC
      const incomeValue = ethers.parseUnits("25000", 6); // 25k USDC
      await (testVault as any).setAssetForTest(
        1,
        0, // AssetStatus.Active
        capitalValue,
        incomeValue,
        ""
      );
      const asset = await testVault.getAsset(1);
      expect(asset.capitalValue).to.equal(capitalValue);
      expect(asset.incomeValue).to.equal(incomeValue);
    });

    it("getAsset returns status, capitalValue, incomeValue after setAssetForTest", async () => {
      const capitalValue = ethers.parseUnits("750000", 6);
      const incomeValue = ethers.parseUnits("37500", 6);
      await (testVault as any).setAssetForTest(
        1,
        0, // AssetStatus.Active
        capitalValue,
        incomeValue,
        ""
      );
      const asset = await testVault.getAsset(1);
      expect(asset.status).to.equal(0); // Active
      expect(asset.capitalValue).to.equal(capitalValue);
      expect(asset.incomeValue).to.equal(incomeValue);
    });

    it("getAsset returns metadataURI empty by default", async () => {
      const asset = await testVault.getAsset(1);
      expect(asset.metadataURI).to.equal("");
    });

    it("getAsset returns metadataURI pointing to IPFS JSON with asset metadata", async () => {
      // Set an asset with a metadataURI pointing to IPFS JSON
      const metadataURI = "ipfs://QmTestAssetMetadata123";
      await (testVault as any).setAssetForTest(
        1,
        0, // AssetStatus.Active
        ethers.parseUnits("1000000", 6),
        ethers.parseUnits("50000", 6),
        metadataURI
      );
      const asset = await testVault.getAsset(1);
      expect(asset.metadataURI).to.equal(metadataURI);
      
      // Frontend would fetch this URI from IPFS and unpack JSON containing:
      // { assetType, area, yearBuilt, purchasePrice, jurisdiction }
    });

    it("combines metadata JSON with on-chain storage data for display", async () => {
      const capitalValue = ethers.parseUnits("5000000", 6); // $5M capital value
      const incomeValue = ethers.parseUnits("250000", 6); // $250k annual income
      const metadataURI = "ipfs://QmMockAssetMetadata456";

      await (testVault as any).setAssetForTest(
        1,
        0, // AssetStatus.Active
        capitalValue,
        incomeValue,
        metadataURI
      );

      const asset = await testVault.getAsset(1);

      // Mock JSON at metadataURI - contains address, purchasePrice, area, images, documents
      const mockMetadataJSON = {
        assetType: "Office Building",
        address: "123 Commercial Blvd",
        purchasePrice: 5000000,
        area: 12000,
        yearBuilt: 1998,
        jurisdiction: "UK",
        legalDescription: "Prime commercial office building",
        images: ["ipfs://QmImage1", "ipfs://QmImage2"],
        documents: ["ipfs://QmDoc1"],
      };

      const combinedDisplayData = {
        status: asset.status,
        capitalValue: asset.capitalValue.toString(),
        incomeValue: asset.incomeValue.toString(),
        metadataURI: asset.metadataURI,
        createdAt: asset.createdAt.toString(),
        updatedAt: asset.updatedAt.toString(),
        ...mockMetadataJSON,
      };

      expect(combinedDisplayData.status).to.equal(0);
      expect(combinedDisplayData.metadataURI).to.equal(metadataURI);
      expect(combinedDisplayData.capitalValue).to.equal(capitalValue.toString());
      expect(combinedDisplayData.incomeValue).to.equal(incomeValue.toString());
      expect(combinedDisplayData.address).to.equal("123 Commercial Blvd");
      expect(combinedDisplayData.purchasePrice).to.equal(5000000);
      expect(combinedDisplayData.area).to.equal(12000);
      expect(combinedDisplayData.images).to.deep.equal(["ipfs://QmImage1", "ipfs://QmImage2"]);
      expect(combinedDisplayData.documents).to.deep.equal(["ipfs://QmDoc1"]);
    });
  });
});

