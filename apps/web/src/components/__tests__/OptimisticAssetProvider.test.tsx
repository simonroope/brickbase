import { fireEvent, render, screen } from "@testing-library/react";
import {
  OptimisticAssetProvider,
  useShowAsset,
} from "../OptimisticAssetProvider";
import { OptimisticAssetSlot } from "../OptimisticAssetSlot";

const navigation = { pathname: "/" };

jest.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

jest.mock("../AssetDetail", () => ({
  AssetDetail: ({ assetId }: { assetId: number }) => (
    <div>Asset detail {assetId}</div>
  ),
}));

function OpenAssetButton() {
  const showAsset = useShowAsset();
  return (
    <button type="button" onClick={() => showAsset(1)}>
      Buy Shares
    </button>
  );
}

function renderShell() {
  return render(
    <OptimisticAssetProvider>
      <OptimisticAssetSlot>
        <div>Property list</div>
        <OpenAssetButton />
      </OptimisticAssetSlot>
    </OptimisticAssetProvider>
  );
}

describe("OptimisticAssetProvider", () => {
  beforeEach(() => {
    navigation.pathname = "/";
  });

  it("keeps the property list on the homepage until Buy Shares is pressed", () => {
    renderShell();
    expect(screen.getByText("Property list")).toBeInTheDocument();
    expect(screen.queryByText("Asset detail 1")).not.toBeInTheDocument();
  });

  it("renders the cached detail view immediately on Buy Shares, before the route RSC arrives", () => {
    renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Buy Shares" }));

    expect(screen.getByText("Asset detail 1")).toBeInTheDocument();
    expect(screen.queryByText("Property list")).not.toBeInTheDocument();
  });

  it("renders the detail view when the URL is already the property route", () => {
    navigation.pathname = "/asset-property/7";
    renderShell();
    expect(screen.getByText("Asset detail 7")).toBeInTheDocument();
    expect(screen.queryByText("Property list")).not.toBeInTheDocument();
  });

  it("returns to the property list when navigating home after a pending detail view", () => {
    const { rerender } = renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Buy Shares" }));
    expect(screen.getByText("Asset detail 1")).toBeInTheDocument();

    navigation.pathname = "/asset-property/1";
    rerender(
      <OptimisticAssetProvider>
        <OptimisticAssetSlot>
          <div>Property list</div>
          <OpenAssetButton />
        </OptimisticAssetSlot>
      </OptimisticAssetProvider>
    );

    navigation.pathname = "/";
    rerender(
      <OptimisticAssetProvider>
        <OptimisticAssetSlot>
          <div>Property list</div>
          <OpenAssetButton />
        </OptimisticAssetSlot>
      </OptimisticAssetProvider>
    );

    expect(screen.getByText("Property list")).toBeInTheDocument();
    expect(screen.queryByText("Asset detail 1")).not.toBeInTheDocument();
  });
});
