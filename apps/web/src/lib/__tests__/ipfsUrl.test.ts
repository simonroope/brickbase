import {
  createIpfsJsonFetcher,
  ipfsCidPath,
  ipfsGatewayUrls,
  toIpfsGatewayUrl,
} from "@brickbase/chains";

const CID = "bafkreihuvf5pnroufid4cpzfy4fhyyahononohxoycmdnaiobxibk525am";

describe("toIpfsGatewayUrl", () => {
  it.each([
    [
      `ipfs://${CID}`,
      `https://gateway.pinata.cloud/ipfs/${CID}`,
    ],
    [
      `https://ivory-independent-bison-569.mypinata.cloud/ipfs/${CID}`,
      `https://gateway.pinata.cloud/ipfs/${CID}`,
    ],
    [
      "https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/photo.jpg",
      "https://gateway.pinata.cloud/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/photo.jpg",
    ],
    [
      "https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
      "https://gateway.pinata.cloud/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
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

describe("ipfsCidPath", () => {
  it("extracts the CID path from ipfs and gateway URIs", () => {
    expect(ipfsCidPath(`ipfs://${CID}`)).toBe(CID);
    expect(ipfsCidPath(`https://ipfs.io/ipfs/${CID}`)).toBe(CID);
    expect(ipfsCidPath("https://images.unsplash.com/photo-example")).toBeNull();
  });
});

describe("ipfsGatewayUrls", () => {
  it("lists public gateways for a CID so fetch can fail over on 429", () => {
    expect(ipfsGatewayUrls(`ipfs://${CID}`)).toEqual([
      `https://gateway.pinata.cloud/ipfs/${CID}`,
      `https://w3s.link/ipfs/${CID}`,
      `https://ipfs.io/ipfs/${CID}`,
    ]);
  });
});

describe("createIpfsJsonFetcher", () => {
  const jsonBody = { name: "Lyons House", images: [] };

  function jsonResponse(body: unknown, status = 200): Response {
    const payload = JSON.stringify(body);
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => payload,
      json: async () => body,
    } as Response;
  }

  it("tries the next public gateway when the first returns 429", async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 429))
      .mockResolvedValueOnce(jsonResponse(jsonBody, 200));
    const fetchIpfsJson = createIpfsJsonFetcher(fetchImpl);
    const json = await fetchIpfsJson(`ipfs://${CID}`);
    expect(json).toEqual(jsonBody);
    expect(fetchImpl.mock.calls[0][0]).toBe(`https://gateway.pinata.cloud/ipfs/${CID}`);
    expect(fetchImpl.mock.calls[1][0]).toBe(`https://w3s.link/ipfs/${CID}`);
  });

  it("parses JSON when the gateway omits application/json", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/plain" }),
      text: async () => JSON.stringify(jsonBody),
    } as Response);
    const fetchIpfsJson = createIpfsJsonFetcher(fetchImpl);
    expect(await fetchIpfsJson(`ipfs://${CID}`)).toEqual(jsonBody);
  });

  it("reuses a successful CID response instead of refetching", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(jsonBody, 200));
    const fetchIpfsJson = createIpfsJsonFetcher(fetchImpl);
    await fetchIpfsJson(`ipfs://${CID}`);
    await fetchIpfsJson(`https://ipfs.io/ipfs/${CID}`);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
