import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AssetDetail } from "../AssetDetail";
import { fetchAssetDetail, getUserShareBalance } from "@/lib/contracts";
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
  fetchAssetDetail: jest.fn(),
  getUserShareBalance: jest.fn(),
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: jest.fn(),
}));

const mockFetchAssetDetail = fetchAssetDetail as jest.MockedFunction<typeof fetchAssetDetail>;
const mockGetUserShareBalance = getUserShareBalance as jest.MockedFunction<typeof getUserShareBalance>;
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

function makeAsset(overrides: Record<string, unknown> = {}) {
  return {
    assetId: 1,
    exists: true,
    status: 0,
    capitalValue: BigInt(500000),
    incomeValue: BigInt(25000),
    metadataUri: "ipfs://meta",
    metadata: {
      name: "Sunset Villa",
      address: "123 Ocean Ave",
      assetType: "Residential",
      jurisdiction: "CA, USA",
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
    mockFetchAssetDetail.mockReturnValue(new Promise(() => {}));
    const { container } = renderWithClient(<AssetDetail assetId={1} />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders a not-found message when the asset does not exist", async () => {
    mockFetchAssetDetail.mockResolvedValue(makeAsset({ exists: false }) as never);
    renderWithClient(<AssetDetail assetId={1} />);
    expect(
      await screen.findByText(/Property not found or no shares created yet\./i)
    ).toBeInTheDocument();
  });

  it("keeps showing the skeleton when the query resolves to null", async () => {
    // The `isLoading || !asset` guard catches a null result before the
    // not-found branch (which requires a truthy asset with exists === false),
    // so a null asset renders the loading skeleton indefinitely.
    mockFetchAssetDetail.mockResolvedValue(null as never);
    const { container } = renderWithClient(<AssetDetail assetId={1} />);
    await waitFor(() => expect(mockFetchAssetDetail).toHaveBeenCalled());
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(
      screen.queryByText(/Property not found or no shares created yet\./i)
    ).not.toBeInTheDocument();
  });

  it("renders asset metadata, financials and status once loaded", async () => {
    mockFetchAssetDetail.mockResolvedValue(makeAsset() as never);
    renderWithClient(<AssetDetail assetId={1} />);

    expect(await screen.findByRole("heading", { name: "Sunset Villa" })).toBeInTheDocument();
    expect(screen.getByText("123 Ocean Ave")).toBeInTheDocument();
    expect(screen.getByText("Residential")).toBeInTheDocument();
    expect(screen.getByText("CA, USA")).toBeInTheDocument();
    // status 0 -> "Active"
    expect(screen.getByText("Active")).toBeInTheDocument();
    // financial labels are always rendered
    expect(screen.getByText("Capital Value:")).toBeInTheDocument();
    expect(screen.getByText("Share Price:")).toBeInTheDocument();
    expect(screen.getByTestId("buy-shares")).toBeInTheDocument();
  });

  it("falls back to Asset #id heading when no metadata name/address is present", async () => {
    mockFetchAssetDetail.mockResolvedValue(
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
    mockFetchAssetDetail.mockResolvedValue(makeAsset() as never);
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
    mockFetchAssetDetail.mockResolvedValue(makeAsset() as never);
    mockGetUserShareBalance.mockResolvedValue(BigInt(0));

    renderWithClient(<AssetDetail assetId={1} />);

    await screen.findByRole("heading", { name: "Sunset Villa" });
    expect(screen.queryByText("Your balance:")).not.toBeInTheDocument();
  });

  it("renders a gallery when more than one image is provided", async () => {
    mockFetchAssetDetail.mockResolvedValue(
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
