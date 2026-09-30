const PUBLIC_IPFS_GATEWAY = "https://ipfs.io/ipfs";

const PINATA_IPFS_PATH =
  /^https?:\/\/[^/]*(?:mypinata\.cloud|pinata\.cloud)\/ipfs\/(.+)$/i;

const BARE_CID =
  /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafk[a-zA-Z0-9]+|bafy[a-zA-Z0-9]+)/;

function ipfsPathFromPinata(url: string): string | null {
  return url.match(PINATA_IPFS_PATH)?.[1] ?? null;
}

function isBlank(u: string): boolean {
  return !u || typeof u !== "string";
}

function isHttpUrl(u: string): boolean {
  return u.startsWith("http://") || u.startsWith("https://");
}

function fromIpfsProtocol(u: string): string | null {
  if (!u.startsWith("ipfs://")) return null;
  return `${PUBLIC_IPFS_GATEWAY}/${u.slice(7).replace(/^ipfs\//, "")}`;
}

/**
 * Resolve metadata and media URIs to a public IPFS gateway.
 * Dedicated Pinata gateways are rewritten so CID-addressed content is fetched
 * without consuming Pinata bandwidth.
 */
export function toIpfsGatewayUrl(u: string): string {
  if (isBlank(u)) return "";
  const trimmed = u.trim();
  const fromProtocol = fromIpfsProtocol(trimmed);
  if (fromProtocol) return fromProtocol;
  const pinataPath = ipfsPathFromPinata(trimmed);
  if (pinataPath) return `${PUBLIC_IPFS_GATEWAY}/${pinataPath}`;
  if (isHttpUrl(trimmed)) return trimmed;
  if (BARE_CID.test(trimmed)) return `${PUBLIC_IPFS_GATEWAY}/${trimmed}`;
  return trimmed;
}
