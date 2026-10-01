import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { OraclePrices } from "../OraclePrices";
import { loadOraclePrices } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";

jest.mock("@/lib/contracts", () => ({
  loadOraclePrices: jest.fn(),
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: jest.fn(),
}));

const mockLoadOraclePrices = loadOraclePrices as jest.MockedFunction<typeof loadOraclePrices>;
const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

const samplePrices = {
  ethUsd: { price: BigInt(2010_00000000), updatedAt: BigInt(1) },
  gbpUsd: { price: BigInt(1_25000000), updatedAt: BigInt(1) },
  goldUsd: { price: BigInt(5100_00000000), updatedAt: BigInt(1) },
  ftse100: { value: BigInt(8300_00000000), updatedAt: BigInt(1) },
};

const disconnectedWallet = {
  address: null as `0x${string}` | null,
  isConnected: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
};

const connectedWallet = {
  address: "0xC357cfe6f8acDB4e2D0Daa9751F24DB77Bfbfe3e" as `0x${string}`,
  isConnected: true,
  connect: jest.fn(),
  disconnect: jest.fn(),
};

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function expectOraclePricesVisible() {
  expect(await screen.findByText(/\$2,010.00/)).toBeInTheDocument();
  expect(screen.getByText(/ETH\/USD:/)).toBeInTheDocument();
  expect(screen.getByText(/GBP\/USD:/)).toBeInTheDocument();
  expect(screen.getByText(/\$1.25/)).toBeInTheDocument();
  expect(screen.getByText(/Gold\/USD:/)).toBeInTheDocument();
  expect(screen.getByText(/\$5,100.00/)).toBeInTheDocument();
  expect(screen.getByText(/FTSE 100:/)).toBeInTheDocument();
  expect(screen.getByText(/\$8,300/)).toBeInTheDocument();
}

describe("OraclePrices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadOraclePrices.mockResolvedValue(samplePrices);
  });

  it("shows ETH/USD, GBP/USD, Gold/USD, and FTSE 100 when no wallet is connected", async () => {
    mockUseWallet.mockReturnValue(disconnectedWallet);
    renderWithClient(<OraclePrices />);
    await expectOraclePricesVisible();
  });

  it("shows ETH/USD, GBP/USD, Gold/USD, and FTSE 100 when a wallet is connected", async () => {
    mockUseWallet.mockReturnValue(connectedWallet);
    renderWithClient(<OraclePrices />);
    await expectOraclePricesVisible();
  });

  it("centers the price row so wrapped labels stay centred on a narrow viewport", async () => {
    mockUseWallet.mockReturnValue(disconnectedWallet);
    renderWithClient(<OraclePrices />);
    const ethUsd = await screen.findByText(/ETH\/USD:/);
    expect(ethUsd.closest("div")).toHaveClass("justify-center");
  });
});
