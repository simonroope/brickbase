/**
 * @jest-environment node
 */
import { describe, it, expect } from "@jest/globals";
import { GET } from "../health";

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
