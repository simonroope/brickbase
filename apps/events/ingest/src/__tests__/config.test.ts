import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chainHeadLogLabel, getChainHeadWsUrl } from "../config.js";

describe("getChainHeadWsUrl", () => {
  it("derives wss from an Infura HTTP RPC URL", () => {
    assert.equal(
      getChainHeadWsUrl("abc123", "https://sepolia.infura.io/v3/"),
      "wss://sepolia.infura.io/ws/v3/abc123"
    );
  });

  it("uses Hardhat WebSocket for a loopback RPC without a project id", () => {
    assert.equal(
      getChainHeadWsUrl("", "http://127.0.0.1:8545"),
      "ws://127.0.0.1:8545"
    );
    assert.equal(
      getChainHeadWsUrl("", "http://localhost:8545"),
      "ws://localhost:8545"
    );
  });

  it("does not send a loopback RPC to Infura even when INFURA_WS_NETWORK is set", () => {
    assert.equal(
      getChainHeadWsUrl("abc123", "http://127.0.0.1:8545", "sepolia"),
      "ws://127.0.0.1:8545"
    );
  });

  it("uses INFURA_WS_NETWORK when the RPC URL is a remote non-Infura host", () => {
    assert.equal(
      getChainHeadWsUrl("abc123", "https://rpc.sepolia.org", "sepolia"),
      "wss://sepolia.infura.io/ws/v3/abc123"
    );
  });

  it("returns null for Infura HTTP without a project id", () => {
    assert.equal(getChainHeadWsUrl("", "https://sepolia.infura.io/v3/"), null);
  });
});

describe("chainHeadLogLabel", () => {
  it("names the connected chain", () => {
    assert.equal(chainHeadLogLabel(31337), "hardhat");
    assert.equal(chainHeadLogLabel(11155111), "sepolia");
    assert.equal(chainHeadLogLabel(1), "mainnet");
    assert.equal(chainHeadLogLabel(8453), "base");
    assert.equal(chainHeadLogLabel(84532), "base-sepolia");
    assert.equal(chainHeadLogLabel(999), "chain-999");
  });
});

