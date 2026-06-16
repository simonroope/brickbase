import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCoinbaseTicker } from "../coinbaseFeed.js";
import { parseInfuraNewHead } from "../infuraFeed.js";

describe("parseCoinbaseTicker", () => {
  it("extracts price from ticker channel event", () => {
    const raw = JSON.stringify({
      channel: "ticker",
      events: [
        {
          type: "update",
          tickers: [
            {
              product_id: "ETH-USD",
              price: "3500.12",
              price_percent_chg_24h: "1.5",
              volume_24h: "1000",
            },
          ],
        },
      ],
    });
    const result = parseCoinbaseTicker(raw, "ETH-USD");
    assert.equal(result?.price, "3500.12");
    assert.equal(result?.change24h, "1.5");
  });
});

describe("parseInfuraNewHead", () => {
  it("parses newHeads subscription notification", () => {
    const raw = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_subscription",
      params: {
        subscription: "0x1",
        result: {
          number: "0x10",
          hash: "0xabc",
          timestamp: "0x5f5e100",
        },
      },
    });
    const result = parseInfuraNewHead(raw, 11155111);
    assert.equal(result?.blockNumber, "16");
    assert.equal(result?.blockHash, "0xabc");
    assert.equal(result?.chainId, 11155111);
  });
});
