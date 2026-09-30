/**
 * @jest-environment node
 */
import { stubIndexedDbForSsr } from "../../config/indexedDbStub";

describe("stubIndexedDbForSsr", () => {
  it("exposes indexedDB.open so WalletConnect can SSR without throwing", () => {
    expect(typeof globalThis.indexedDB.open).toBe("function");
  });

  it("does not replace indexedDB when it is already defined", () => {
    const first = globalThis.indexedDB;
    stubIndexedDbForSsr();
    expect(globalThis.indexedDB).toBe(first);
  });
});
