/**
 * Mock asset data used by the app.
 */
export const mockMetadata = {
  assetType: "office",
  name: "Lyons House",
  address: "123 Cannon Street, London EC1 3JN",
  purchasePrice: BigInt("14000000000000000000000000"), // 14M with 18 decimals
  purchaseDate: "2019-04-01",
  area: 10_000,
  yearBuilt: 1995,
  jurisdiction: "UK",
  images: [] as string[],
  documents: [] as string[],
};

export const mockAsset = {
  assetId: 1,
  status: 0, // Active
  capitalValue: BigInt(5_000_000_000_000), // 5M USDC (6 decimals)
  incomeValue: BigInt(300_000_000_000), // 300k USDC
  metadataUri: "ipfs://QmTestLyonsHouse1234567890abcdef/metadata.json",
  metadata: mockMetadata,
  totalSupply: BigInt(1000),
  availableSupply: BigInt(500),
  sharePrice: BigInt("100000000000000000000"), // 100 USDC per share (18 decimals)
  tradingEnabled: true,
};

export const mockAssets = [mockAsset];
