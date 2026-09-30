import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AssetDetail } from "../AssetDetail";
import { loadAssetDetail, getUserShareBalance } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";

// next/image renders <img> under the hood with extra props that jsdom warns about;
// stub it down to a plain img so we can assert on alt text/src.
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// BuyShares pulls in wagmi/transactions; not under test here.
jest.mock("../BuyShares", () => ({
  BuyShares: () => <div data-testid="buy-shares" />,
}));

jest.mock("@/lib/contracts", () => ({
  loadAssetDetail: jest.fn(),
  getUserShareBalance: jest.fn(),
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: jest.fn(),
}));

const mockLoadAssetDetail = loadAssetDetail as jest.MockedFunction<typeof loadAssetDetail>;
const mockGetUserShareBalance = getUserShareBalance as jest.MockedFunction<typeof getUserShareBalance>;
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

function makeAsset(overrides: Record<string, unknown> = {}) {
  return {
    assetId: 1,
    exists: true,
    status: 0,
    capitalValue: BigInt("155000000000000"),
    incomeValue: BigInt("500000000000"),
    metadataUri: "ipfs://meta",
    metadata: {
      name: "Sunset Villa",
      address: "123 Ocean Ave",
      assetType: "Residential",
      jurisdiction: "CA, USA",
      area: 10_000,
      images: ["https://img.example/1.jpg"],
    },
    totalSupply: BigInt(1000),
    availableSupply: BigInt(400),
    sharePrice: BigInt(1_000_000),
    tradingEnabled: true,
    ...overrides,
  };
}

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("AssetDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue({
      address: null,
      isConnected: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
    mockGetUserShareBalance.mockResolvedValue(BigInt(0));
  });

  it("shows a loading skeleton while the asset query is pending", () => {
    // A never-resolving promise keeps the query in the loading state.
    mockLoadAssetDetail.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithClient(<AssetDetail assetId={1} />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders a not-found message when the asset does not exist", async () => {
    mockLoadAssetDetail.mockResolvedValue(makeAsset({ exists: false }) as never);
    renderWithClient(<AssetDetail assetId={1} />);
    expect(
      await screen.findByText(/Property not found or no shares created yet\./i)
    ).toBeInTheDocument();
  });

  it("renders a not-found message when the query resolves to null", async () => {
    mockLoadAssetDetail.mockResolvedValue(null as never);
    renderWithClient(<AssetDetail assetId={1} />);
    expect(
      await screen.findByText(/Property not found or no shares created yet\./i)
    ).toBeInTheDocument();
  });

  it("renders asset metadata, financials and status once loaded", async () => {
    mockLoadAssetDetail.mockResolvedValue(makeAsset() as never);
    renderWithClient(<AssetDetail assetId={1} />);

    expect(await screen.findByRole("heading", { name: "Sunset Villa" })).toBeInTheDocument();
    expect(screen.getByText("123 Ocean Ave")).toBeInTheDocument();
    expect(screen.getByText("Residential")).toBeInTheDocument();
    expect(screen.getByText("CA, USA")).toBeInTheDocument();
    expect(screen.getByText("Area:")).toBeInTheDocument();
    expect(screen.getByText("10,000")).toBeInTheDocument();
    // status 0 -> "Active"
    expect(screen.getByText("Active")).toBeInTheDocument();
    // financial labels are always rendered
    expect(screen.getByText("Capital Value:")).toBeInTheDocument();
    expect(screen.getByText("$155,000,000.00")).toBeInTheDocument();
    expect(screen.getByText("Income Value:")).toBeInTheDocument();
    expect(screen.getByText("$500,000.00")).toBeInTheDocument();
    expect(screen.getByText("Share Price:")).toBeInTheDocument();
    expect(screen.getByTestId("buy-shares")).toBeInTheDocument();
  });

  it("falls back to Asset #id heading when no metadata name/address is present", async () => {
    mockLoadAssetDetail.mockResolvedValue(
      makeAsset({ metadata: { images: [] } }) as never
    );
    renderWithClient(<AssetDetail assetId={42} />);
    expect(await screen.findByRole("heading", { name: "Asset #42" })).toBeInTheDocument();
  });

  it("shows the user balance row when the wallet holds shares", async () => {
    mockUseWallet.mockReturnValue({
      address: "0xabc",
      isConnected: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
    mockLoadAssetDetail.mockResolvedValue(makeAsset() as never);
    mockGetUserShareBalance.mockResolvedValue(BigInt(7));

    renderWithClient(<AssetDetail assetId={1} />);

    expect(await screen.findByText("Your balance:")).toBeInTheDocument();
    expect(screen.getByText(/7 shares/)).toBeInTheDocument();
  });

  it("does not show a balance row when the connected wallet holds zero shares", async () => {
    mockUseWallet.mockReturnValue({
      address: "0xabc",
      isConnected: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
    mockLoadAssetDetail.mockResolvedValue(makeAsset() as never);
    mockGetUserShareBalance.mockResolvedValue(BigInt(0));

    renderWithClient(<AssetDetail assetId={1} />);

    await screen.findByRole("heading", { name: "Sunset Villa" });
    expect(screen.queryByText("Your balance:")).not.toBeInTheDocument();
  });

  it("renders a gallery when more than one image is provided", async () => {
    mockLoadAssetDetail.mockResolvedValue(
      makeAsset({
        metadata: {
          name: "Sunset Villa",
          images: ["https://img.example/1.jpg", "https://img.example/2.jpg"],
        },
      }) as never
    );
    renderWithClient(<AssetDetail assetId={1} />);

    expect(await screen.findByText("Gallery")).toBeInTheDocument();
    expect(screen.getByAltText("View 2")).toBeInTheDocument();
  });
});
