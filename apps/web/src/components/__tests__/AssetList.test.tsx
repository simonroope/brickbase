import { render, screen } from "@testing-library/react";
import { AssetList } from "../AssetList";
import type { AssetSummary } from "@/lib/contracts";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

const onChainAsset: AssetSummary = {
  assetId: 1,
  status: 0,
  capitalValue: BigInt(5_000_000),
  incomeValue: BigInt(250_000),
  metadataUri: "ipfs://QmOnChainAsset",
  metadata: {
    name: "Cannon Street Office",
    address: "123 Cannon Street",
    location: "London",
    images: [],
  },
  totalSupply: BigInt(1000),
  availableSupply: BigInt(400),
  sharePrice: BigInt("100000000000000000000"),
  tradingEnabled: true,
};

describe("AssetList", () => {
  it("renders on-chain properties without a connected wallet", () => {
    render(<AssetList assets={[onChainAsset]} />);

    expect(screen.getByText("Cannon Street Office")).toBeInTheDocument();
    expect(screen.getByText("Location: London")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buy Shares" })).toBeInTheDocument();
  });
});
