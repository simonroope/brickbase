import { render, screen, fireEvent } from "@testing-library/react";
import { AccountPanel } from "../AccountPanel";
import { useWallet } from "@/hooks/useWallet";

jest.mock("@/hooks/useWallet", () => ({
  useWallet: jest.fn(),
}));

// ConnectBtn renders a Web3Modal <w3m-button> web component; stub it so we can
// assert the connect action is offered without pulling in Web3Modal.
jest.mock("../ConnectBtn", () => ({
  __esModule: true,
  default: () => <div data-testid="connect-btn" />,
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;

const CONNECTED_ADDRESS: `0x${string}` = "0x1234567890abcdef1234567890abcdef12345678";

function disconnected() {
  return { address: null, isConnected: false, connect: jest.fn(), disconnect: jest.fn() };
}

function connected() {
  return { address: CONNECTED_ADDRESS, isConnected: true, connect: jest.fn(), disconnect: jest.fn() };
}

describe("AccountPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // jsdom has no navigator.clipboard; tests that stub it must not leak the stub
  // onto navigator for later tests.
  afterEach(() => {
    delete (navigator as { clipboard?: unknown }).clipboard;
  });

  it("shows the connect prompt with a connect action and no address when disconnected", () => {
    mockUseWallet.mockReturnValue(disconnected());

    render(<AccountPanel />);

    expect(
      screen.getByText(/Connect your wallet to view your account/i)
    ).toBeInTheDocument();
    expect(screen.getByTestId("connect-btn")).toBeInTheDocument();
    expect(screen.queryByText(/^0x/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy address/i })).not.toBeInTheDocument();
  });

  it("displays the full connected wallet address in monospace", () => {
    mockUseWallet.mockReturnValue(connected());

    render(<AccountPanel />);

    const addressEl = screen.getByText(CONNECTED_ADDRESS);
    expect(addressEl).toBeInTheDocument();
    expect(addressEl).toHaveClass("font-mono");
    expect(screen.queryByTestId("connect-btn")).not.toBeInTheDocument();

    // Account is scoped to the wallet address only — no balance, holdings or chain info.
    expect(screen.queryByText(/balance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/holdings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/chain/i)).not.toBeInTheDocument();
  });

  it("shows a copy-to-clipboard button next to the address when connected", () => {
    mockUseWallet.mockReturnValue(connected());

    render(<AccountPanel />);

    expect(screen.getByRole("button", { name: /copy address/i })).toBeInTheDocument();
  });

  it("writes the full wallet address to the clipboard when the copy button is activated", () => {
    const writeText = jest.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    mockUseWallet.mockReturnValue(connected());

    render(<AccountPanel />);
    fireEvent.click(screen.getByRole("button", { name: /copy address/i }));

    expect(writeText).toHaveBeenCalledWith("0x1234567890abcdef1234567890abcdef12345678");
  });

  it("updates from prompt to address when the wallet connects without a reload", () => {
    mockUseWallet.mockReturnValue(disconnected());
    const { rerender } = render(<AccountPanel />);
    expect(screen.getByTestId("connect-btn")).toBeInTheDocument();

    mockUseWallet.mockReturnValue(connected());
    rerender(<AccountPanel />);

    expect(screen.getByText(CONNECTED_ADDRESS)).toBeInTheDocument();
    expect(screen.queryByTestId("connect-btn")).not.toBeInTheDocument();
  });
});
