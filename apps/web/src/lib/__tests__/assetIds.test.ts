import { resolveAssetIds } from "../assetIds";

const recordedAsset = {
  status: 0,
  capitalValue: BigInt(5_000_000),
  incomeValue: BigInt(250_000),
  metadataURI: "ipfs://QmOnChainAsset",
  createdAt: BigInt(1_700_000_000),
  updatedAt: BigInt(0),
};

const emptyAsset = {
  status: 0,
  capitalValue: BigInt(0),
  incomeValue: BigInt(0),
  metadataURI: "",
  createdAt: BigInt(0),
  updatedAt: BigInt(0),
};

describe("resolveAssetIds", () => {
  it("uses AssetVaulted log ids when they exist", async () => {
    const ids = await resolveAssetIds([3, 5], async () => emptyAsset);
    expect(ids).toEqual([3, 5]);
  });

  it("probes sequential getAsset ids when logs are empty", async () => {
    const recorded: Record<number, typeof recordedAsset> = { 1: recordedAsset };
    const ids = await resolveAssetIds([], async (id) => recorded[id] ?? emptyAsset);
    expect(ids).toEqual([1]);
  });

  it("returns no ids when the vault has no recorded assets", async () => {
    const ids = await resolveAssetIds([], async () => emptyAsset);
    expect(ids).toEqual([]);
  });
});
