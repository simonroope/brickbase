import { expect } from "chai";
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
