import { describe, it, expect } from "@jest/globals";
import { formatUsdc, formatNum, formatOracleNum, formatOracleInt, ASSET_STATUS } from "../format";

describe("format", () => {
  describe("formatUsdc", () => {
    it("formats 6-decimal USDC values as USD currency", () => {
      expect(formatUsdc(BigInt(1_000_000))).toContain("1.00");
      expect(formatUsdc(BigInt(100_000_000))).toContain("100.00");
      expect(formatUsdc(BigInt(1_234_567_890))).toContain("1,234.57");
    });
  });

  describe("formatNum", () => {
    it("formats 18-decimal share price as USD", () => {
      expect(formatNum(BigInt("100000000000000000000"))).toContain("100");
    });
  });

  describe("formatOracleNum", () => {
    it("formats oracle price with 8 decimals, 0 fraction", () => {
      expect(formatOracleNum(BigInt(3500_00000000))).toContain("3,500");
    });
  });

  describe("formatOracleInt", () => {
    it("formats oracle price with 8 decimals, 2 fraction places", () => {
      expect(formatOracleInt(BigInt(3500_50000000))).toContain("3,500.50");
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
