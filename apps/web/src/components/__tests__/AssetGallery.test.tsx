import { fireEvent, render, screen } from "@testing-library/react";
import { AssetGallery, galleryVisibleCount } from "../AssetGallery";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

const images = [
  "https://img.example/1.jpg",
  "https://img.example/2.jpg",
  "https://img.example/3.jpg",
];

const originalClientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientWidth"
);

function mockClientWidth(width: number) {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => width,
  });
}

describe("galleryVisibleCount", () => {
  it("fits as many 192px thumbnails with 16px gaps as the viewport allows", () => {
    expect(galleryVisibleCount(0, 3)).toBe(3);
    expect(galleryVisibleCount(192, 3)).toBe(1);
    expect(galleryVisibleCount(512, 3)).toBe(2);
    expect(galleryVisibleCount(608, 3)).toBe(3);
  });
});

describe("AssetGallery", () => {
  afterEach(() => {
    if (originalClientWidth) {
      Object.defineProperty(HTMLElement.prototype, "clientWidth", originalClientWidth);
    }
  });

  it("shows every image that fits and hides arrows when all are visible", () => {
    mockClientWidth(608);
    render(<AssetGallery images={images} />);

    expect(screen.getByRole("heading", { name: "Gallery" })).toBeInTheDocument();
    expect(screen.getByAltText("View 1")).toHaveAttribute("src", images[0]);
    expect(screen.getByAltText("View 2")).toHaveAttribute("src", images[1]);
    expect(screen.getByAltText("View 3")).toHaveAttribute("src", images[2]);
    expect(screen.queryByRole("button", { name: "Previous image" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();
  });

  it("pages through overflow images with arrows and wraps at each end", () => {
    mockClientWidth(512);
    render(<AssetGallery images={images} />);

    expect(screen.getByAltText("View 1")).toBeInTheDocument();
    expect(screen.getByAltText("View 2")).toBeInTheDocument();
    expect(screen.queryByAltText("View 3")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous image" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Next image" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.queryByAltText("View 1")).not.toBeInTheDocument();
    expect(screen.getByAltText("View 2")).toBeInTheDocument();
    expect(screen.getByAltText("View 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getByAltText("View 3")).toBeInTheDocument();
    expect(screen.getByAltText("View 1")).toBeInTheDocument();
    expect(screen.queryByAltText("View 2")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    expect(screen.getByAltText("View 2")).toBeInTheDocument();
    expect(screen.getByAltText("View 3")).toBeInTheDocument();
  });

  it("wraps to the last images when previous is pressed on the first thumbnail", () => {
    mockClientWidth(512);
    render(<AssetGallery images={images} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous image" }));
    expect(screen.getByAltText("View 3")).toBeInTheDocument();
    expect(screen.getByAltText("View 1")).toBeInTheDocument();
    expect(screen.queryByAltText("View 2")).not.toBeInTheDocument();
  });

  it("hides the arrows when there is only one image", () => {
    mockClientWidth(608);
    render(<AssetGallery images={[images[0]]} />);

    expect(screen.getByAltText("View 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous image" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();
  });

  it("notifies when a thumbnail is clicked", () => {
    mockClientWidth(608);
    const onSelect = jest.fn();
    render(<AssetGallery images={images} onSelect={onSelect} />);

    fireEvent.click(screen.getByAltText("View 2"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
