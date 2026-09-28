import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BuyShares } from "../BuyShares";
import { isUserAllowlisted } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";

jest.mock("@/lib/transactions", () => ({
  purchaseShares: jest.fn(),
}));

jest.mock("@/lib/contracts", () => ({
  isUserAllowlisted: jest.fn(),
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockIsUserAllowlisted = isUserAllowlisted as jest.MockedFunction<typeof isUserAllowlisted>;

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const buyProps = {
  assetId: 1,
  sharePrice: BigInt("100000000000000000000"),
  availableSupply: BigInt(400),
};

describe("BuyShares", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsUserAllowlisted.mockResolvedValue(true);
  });

  it("asks the user to connect a wallet before purchasing", () => {
    mockUseWallet.mockReturnValue({
      address: null,
      isConnected: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    renderWithClient(<BuyShares {...buyProps} />);

    expect(screen.getByText("Connect your wallet to purchase shares.")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Number of shares")).not.toBeInTheDocument();
  });

  it("shows the purchase form when a wallet is connected", async () => {
    mockUseWallet.mockReturnValue({
      address: "0xC357cfe6f8acDB4e2D0Daa9751F24DB77Bfbfe3e",
      isConnected: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    renderWithClient(<BuyShares {...buyProps} />);

    expect(await screen.findByPlaceholderText("Number of shares")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buy Shares" })).toBeInTheDocument();
  });
});
