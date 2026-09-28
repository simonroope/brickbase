import { resolveDeployedAddress } from "../deployedAddresses";
import localhostAddresses from "../../../../../contracts/deployments/localhost-addresses.json";

describe("resolveDeployedAddress", () => {
  const original = {
    ORACLE_ROUTER_ADDRESS: process.env.ORACLE_ROUTER_ADDRESS,
    CHAIN_ID: process.env.CHAIN_ID,
  };

  afterEach(() => {
    process.env.ORACLE_ROUTER_ADDRESS = original.ORACLE_ROUTER_ADDRESS;
    process.env.CHAIN_ID = original.CHAIN_ID;
  });

  it("prefers the env var when set", () => {
    process.env.ORACLE_ROUTER_ADDRESS = "0x1111111111111111111111111111111111111111";
    expect(resolveDeployedAddress("ORACLE_ROUTER_ADDRESS")).toBe(
      "0x1111111111111111111111111111111111111111"
    );
  });

  it("reads localhost-addresses.json when env is empty and CHAIN_ID is 31337", () => {
    process.env.ORACLE_ROUTER_ADDRESS = "";
    process.env.CHAIN_ID = "31337";
    expect(resolveDeployedAddress("ORACLE_ROUTER_ADDRESS")).toBe(
      localhostAddresses.ORACLE_ROUTER_ADDRESS
    );
  });
});
