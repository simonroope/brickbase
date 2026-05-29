import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLiveFeedMessage } from "../schemas.js";

describe("parseLiveFeedMessage", () => {
  it("parses a valid ticker message", () => {
    const msg = parseLiveFeedMessage(
      JSON.stringify({
        v: 1,
        type: "ticker",
        ts: 1,
        source: "coinbase",
        symbol: "ETH-USD",
        price: "3456.78",
      })
    );
    assert.equal(msg?.type, "ticker");
    assert.equal(msg && "price" in msg ? msg.price : "", "3456.78");
  });

  it("rejects invalid payloads", () => {
    assert.equal(parseLiveFeedMessage("{}"), null);
    assert.equal(parseLiveFeedMessage("not json"), null);
  });
});
