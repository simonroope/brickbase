import { formatLivePrice } from "../formatLivePrice";

describe("formatLivePrice", () => {
  it("formats decimal strings", () => {
    expect(formatLivePrice("3500.1")).toBe("3,500.10");
  });
});
