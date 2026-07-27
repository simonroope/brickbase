import { render, screen } from "@testing-library/react";
import { AccountPanel } from "../AccountPanel";
import { useWallet } from "@/hooks/useWallet";

// ConnectBtn renders the <w3m-button> web component, which is not defined in
// jsdom; stub it to a plain element so we can assert the connect action exists.
jest.mock("../ConnectBtn", () => ({
  __esModule: true,
  default: () => <div data-testid="connect-btn" />,
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

const CONNECTED_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

describe("AccountPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the full connected wallet address in monospace", () => {
    mockUseWallet.mockReturnValue({
      address: CONNECTED_ADDRESS,
      isConnected: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    render(<AccountPanel />);

    const addressEl = screen.getByText(CONNECTED_ADDRESS);
    expect(addressEl).toBeInTheDocument();
    expect(addressEl).toHaveClass("font-mono");
  });

  it("does not show a connect prompt when a wallet is connected", () => {
    mockUseWallet.mockReturnValue({
      address: CONNECTED_ADDRESS,
      isConnected: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    render(<AccountPanel />);

    expect(
      screen.queryByText(/Connect your wallet to view your account/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("connect-btn")).not.toBeInTheDocument();
  });

  it("prompts a disconnected user to connect with a connect action", () => {
    mockUseWallet.mockReturnValue({
      address: null,
      isConnected: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    render(<AccountPanel />);

    expect(
      screen.getByText(/Connect your wallet to view your account/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("connect-btn")).toBeInTheDocument();
  });

  it("renders no wallet address when disconnected", () => {
    mockUseWallet.mockReturnValue({
      address: null,
      isConnected: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    render(<AccountPanel />);

    expect(screen.queryByText(/^0x[a-fA-F0-9]{40}$/)).not.toBeInTheDocument();
  });

  it("shows the address on connect without a remount", () => {
    mockUseWallet.mockReturnValue({
      address: null,
      isConnected: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });

    const { rerender } = render(<AccountPanel />);
    expect(
      screen.getByText(/Connect your wallet to view your account/i)
    ).toBeInTheDocument();

    // Wallet connects; useWallet re-renders the same mounted component.
    mockUseWallet.mockReturnValue({
      address: CONNECTED_ADDRESS,
      isConnected: true,
      connect: jest.fn(),
      disconnect: jest.fn(),
    });
    rerender(<AccountPanel />);

    expect(screen.getByText(CONNECTED_ADDRESS)).toBeInTheDocument();
    expect(
      screen.queryByText(/Connect your wallet to view your account/i)
    ).not.toBeInTheDocument();
  });
});
