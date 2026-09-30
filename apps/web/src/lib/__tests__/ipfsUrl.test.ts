import { toIpfsGatewayUrl } from "@brickbase/chains";

describe("toIpfsGatewayUrl", () => {
  it.each([
    [
      "ipfs://bafkreihuvf5pnroufid4cpzfy4fhyyahononohxoycmdnaiobxibk525am",
      "https://ipfs.io/ipfs/bafkreihuvf5pnroufid4cpzfy4fhyyahononohxoycmdnaiobxibk525am",
    ],
    [
      "https://ivory-independent-bison-569.mypinata.cloud/ipfs/bafkreihuvf5pnroufid4cpzfy4fhyyahononohxoycmdnaiobxibk525am",
      "https://ipfs.io/ipfs/bafkreihuvf5pnroufid4cpzfy4fhyyahononohxoycmdnaiobxibk525am",
    ],
    [
      "https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/photo.jpg",
      "https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/photo.jpg",
    ],
    [
      "https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      "https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    ],
    [
      "https://images.unsplash.com/photo-example",
      "https://images.unsplash.com/photo-example",
    ],
  ])("rewrites %s to a public gateway URL", (input, expected) => {
    expect(toIpfsGatewayUrl(input)).toBe(expected);
  });

  it("returns empty string for blank input", () => {
    expect(toIpfsGatewayUrl("")).toBe("");
  });
});
