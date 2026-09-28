import { expect } from "chai";
import { resolveLiveSeedAllowlist } from "../../scripts/seedAllowlist";
import {
  assertProviderChainId,
  resolveTargetChain,
} from "../../scripts/seedChain";

describe("resolveTargetChain", () => {
  it("uses the Hardhat network when no chain is specified", () => {
    expect(resolveTargetChain("localhost", {}, [])).to.equal("localhost");
    expect(resolveTargetChain("sepolia", {}, [])).to.equal("sepolia");
  });

  it("treats hardhat as localhost", () => {
    expect(resolveTargetChain("hardhat", {}, [])).to.equal("localhost");
  });

  it("uses SEED_CHAIN when it matches the Hardhat network", () => {
    expect(resolveTargetChain("sepolia", { SEED_CHAIN: "sepolia" }, [])).to.equal(
      "sepolia"
    );
  });

  it("uses --chain when it matches the Hardhat network", () => {
    expect(
      resolveTargetChain("base", {}, ["node", "hardhat", "--chain", "base"])
    ).to.equal("base");
  });

  it("rejects an explicit chain that does not match --network", () => {
    expect(() =>
      resolveTargetChain("localhost", { SEED_CHAIN: "sepolia" }, [])
    ).to.throw(/--network sepolia/);
  });

  it("rejects an unknown chain name", () => {
    expect(() => resolveTargetChain("goerli", {}, [])).to.throw(/Unknown chain/);
  });
});

describe("assertProviderChainId", () => {
  it("accepts Sepolia chain id 11155111", () => {
    expect(() => assertProviderChainId("sepolia", 11155111n)).not.to.throw();
  });

  it("rejects a provider on the wrong chain", () => {
    expect(() => assertProviderChainId("sepolia", 31337n)).to.throw(/31337/);
  });
});

describe("resolveLiveSeedAllowlist", () => {
  const signer = "0xC357cfe6f8acDB4e2D0Daa9751F24DB77Bfbfe3e";

  it("allowlists the signer when JSON and env have no users", () => {
    const resolved = resolveLiveSeedAllowlist(signer, {}, {});
    expect(resolved.usersToWhitelist).to.deep.equal([signer]);
    expect(resolved.expectedDeployer).to.equal(signer);
  });

  it("uses admins.defaultAdmin as expectedDeployer when seed.expectedDeployer is unset", () => {
    const admin = "0x1111111111111111111111111111111111111111";
    const resolved = resolveLiveSeedAllowlist(signer, { defaultAdmin: admin }, {});
    expect(resolved.expectedDeployer).to.equal(admin);
  });

  it("prefers JSON usersToWhitelist over the signer", () => {
    const extra = "0x2222222222222222222222222222222222222222";
    const resolved = resolveLiveSeedAllowlist(
      signer,
      { usersToWhitelist: [extra] },
      { SEED_USERS: signer }
    );
    expect(resolved.usersToWhitelist).to.deep.equal([extra]);
  });

  it("uses comma-separated SEED_USERS when JSON list is empty", () => {
    const extra = "0x2222222222222222222222222222222222222222";
    const resolved = resolveLiveSeedAllowlist(signer, {}, { SEED_USERS: `${extra}, ${signer}` });
    expect(resolved.usersToWhitelist).to.deep.equal([extra, signer]);
  });
});
