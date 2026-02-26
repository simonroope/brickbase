import { formatUsdc, formatSharePrice, formatOraclePriceIndex, formatOraclePriceFiat, ASSET_STATUS } from "../format";

describe("format", () => {
  describe("formatUsdc", () => {
    it("formats 6-decimal USDC values as USD currency", () => {
                expect(formatUsdc(BigInt(1_000_000))).toContain("1.00");
      expect(formatUsdc(BigInt(100_000_000))).toContain("100.00");
      expect(formatUsdc(BigInt(1_234_567_890))).toContain("1,234.57");
    });
  });

  describe("formatSharePrice", () => {
    it("formats 18-decimal share price as USD", () => {
            expect(formatSharePrice(BigInt("100000000000000000000"))).toContain("100");
    });
  });

  describe("formatOraclePriceIndex", () => {
    it("formats oracle price with default 8 decimals", () => {
      expect(formatOraclePriceIndex(BigInt(3500_00000000))).toBe("3,500");
    });
  });

  describe("formatOraclePriceFiat", () => {
    it("formats oracle price with 2 decimal places", () => {
      expect(formatOraclePriceFiat(BigInt(3500_50000000))).toBe("3,500.50");
    });
  });

  describe("ASSET_STATUS", () => {
    it("maps status enum to labels", () => {
      expect(ASSET_STATUS[0]).toBe("Active");
      expect(ASSET_STATUS[1]).toBe("Under Contract");
      expect(ASSET_STATUS[2]).toBe("Sold");
      expect(ASSET_STATUS[3]).toBe("Suspended");
    });
  });
});
