import { ethers } from "hardhat";
import { expect } from "chai";

describe("AssetUserAllowList", () => {
  let allowList: any;
  let admin: any;
  let caller: any;
  let stranger: any;
  let user1: any;
  let user2: any;

  beforeEach(async () => {
    [admin, caller, stranger, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AssetUserAllowList");
    allowList = await Factory.deploy();
    await allowList.waitForDeployment();
  });

  it("grants DEFAULT_ADMIN_ROLE to the deployer", async () => {
    expect(await allowList.hasRole(ethers.ZeroHash, admin.address)).to.be.true;
  });

  it("authorizes a caller", async () => {
    await expect(allowList.setAuthorizedCaller(caller.address, true))
      .to.emit(allowList, "AuthorizedCallerUpdated")
      .withArgs(caller.address, true);
    expect(await allowList.isAuthorizedCaller(caller.address)).to.be.true;
  });

  it("revokes an authorized caller", async () => {
    await allowList.setAuthorizedCaller(caller.address, true);
    await allowList.setAuthorizedCaller(caller.address, false);
    expect(await allowList.isAuthorizedCaller(caller.address)).to.be.false;
  });

  it("reverts when authorizing the zero address", async () => {
    await expect(allowList.setAuthorizedCaller(ethers.ZeroAddress, true)).to.be.revertedWith(
      "Invalid caller address"
    );
  });

  it("reverts when a non-admin authorizes a caller", async () => {
    await expect(
      allowList.connect(stranger).setAuthorizedCaller(caller.address, true)
    ).to.be.revertedWithCustomError(allowList, "AccessControlUnauthorizedAccount");
  });

  it("lets an authorized caller allow and deny a user", async () => {
    await allowList.setAuthorizedCaller(caller.address, true);

    await expect(allowList.connect(caller).setUserAllowed(user1.address, true))
      .to.emit(allowList, "UserAllowlistUpdated")
      .withArgs(user1.address, true);
    expect(await allowList.connect(caller).isUserAllowed(user1.address)).to.be.true;

    await allowList.connect(caller).setUserAllowed(user1.address, false);
    expect(await allowList.connect(caller).isUserAllowed(user1.address)).to.be.false;
  });

  it("reverts when an unauthorized caller reads or writes the user allowlist", async () => {
    await expect(allowList.isUserAllowed(user1.address)).to.be.revertedWithCustomError(
      allowList,
      "OnlyAuthorizedCaller"
    );
    await expect(allowList.setUserAllowed(user1.address, true)).to.be.revertedWithCustomError(
      allowList,
      "OnlyAuthorizedCaller"
    );
    await expect(
      allowList.setUsersAllowed([user1.address], [true])
    ).to.be.revertedWithCustomError(allowList, "OnlyAuthorizedCaller");
  });

  it("batch-updates users on the allowlist", async () => {
    await allowList.setAuthorizedCaller(caller.address, true);

    await allowList.connect(caller).setUsersAllowed([user1.address, user2.address], [true, false]);

    expect(await allowList.connect(caller).isUserAllowed(user1.address)).to.be.true;
    expect(await allowList.connect(caller).isUserAllowed(user2.address)).to.be.false;
  });

  it("accepts an empty batch allowlist update", async () => {
    await allowList.setAuthorizedCaller(caller.address, true);
    await allowList.connect(caller).setUsersAllowed([], []);
  });

  it("reverts when batch allowlist arrays have different lengths", async () => {
    await allowList.setAuthorizedCaller(caller.address, true);

    await expect(
      allowList.connect(caller).setUsersAllowed([user1.address], [true, false])
    ).to.be.revertedWith("Arrays length mismatch");
  });
});
