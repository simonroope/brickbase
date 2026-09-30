import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SeedAssetCache } from "../SeedAssetCache";
import type { AssetDetailJson } from "@/lib/contracts";

jest.mock("@/lib/contracts", () => ({
  deserializeAssetDetail: (json: AssetDetailJson) => ({
    ...json,
    capitalValue: BigInt(json.capitalValue),
    incomeValue: BigInt(json.incomeValue),
    totalSupply: BigInt(json.totalSupply),
    availableSupply: BigInt(json.availableSupply),
    sharePrice: BigInt(json.sharePrice),
  }),
}));

const serialized: AssetDetailJson = {
  assetId: 1,
  exists: true,
  status: 0,
  capitalValue: "155000000000000",
  incomeValue: "500000000000",
  metadataUri: "ipfs://meta",
  metadata: { name: "Sunset Villa", images: [] },
  totalSupply: "1000",
  availableSupply: "400",
  sharePrice: "1000000",
  tradingEnabled: true,
};

describe("SeedAssetCache", () => {
  it("seeds the asset query cache so detail views can render without fetching", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <SeedAssetCache assets={[serialized]} />
      </QueryClientProvider>
    );

    expect(client.getQueryData(["asset", 1])).toEqual({
      ...serialized,
      capitalValue: BigInt("155000000000000"),
      incomeValue: BigInt("500000000000"),
      totalSupply: BigInt("1000"),
      availableSupply: BigInt("400"),
      sharePrice: BigInt("1000000"),
    });
  });

  it("does not request the detail route as a side effect of seeding", () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as typeof fetch;
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    try {
      render(
        <QueryClientProvider client={client}>
          <SeedAssetCache assets={[serialized]} />
        </QueryClientProvider>
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
