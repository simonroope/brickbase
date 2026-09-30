export const PUBLIC_IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs",
  "https://w3s.link/ipfs",
  "https://ipfs.io/ipfs",
] as const;

const GENERIC_IPFS_PATH = /^https?:\/\/[^/]+\/ipfs\/(.+)$/i;

const BARE_CID =
  /^(Qm[1-9A-HJ-NP-Za-km-z]{44,}|bafk[a-zA-Z0-9]+|bafy[a-zA-Z0-9]+)/;

function isBlank(u: string): boolean {
  return !u || typeof u !== "string";
}

function cidFromIpfsProtocol(u: string): string | null {
  if (!u.startsWith("ipfs://")) return null;
  return u.slice(7).replace(/^ipfs\//, "");
}

function cidFromHttpGateway(u: string): string | null {
  return u.match(GENERIC_IPFS_PATH)?.[1] ?? null;
}

/** CID + optional path (`bafkrei…` or `Qm…/photo.jpg`), or null if not IPFS. */
export function ipfsCidPath(u: string): string | null {
  if (isBlank(u)) return null;
  const trimmed = u.trim();
  const fromProtocol = cidFromIpfsProtocol(trimmed);
  if (fromProtocol) return fromProtocol;
  const fromHttp = cidFromHttpGateway(trimmed);
  if (fromHttp) return fromHttp;
  if (BARE_CID.test(trimmed)) return trimmed;
  return null;
}

export function ipfsGatewayUrls(u: string): string[] {
  const cidPath = ipfsCidPath(u);
  if (!cidPath) return u ? [u] : [];
  return PUBLIC_IPFS_GATEWAYS.map((gateway) => `${gateway}/${cidPath}`);
}

/**
 * Resolve metadata and media URIs to a public IPFS gateway.
 * Dedicated Pinata gateways are rewritten so CID-addressed content is fetched
 * without consuming Pinata bandwidth.
 */
export function toIpfsGatewayUrl(u: string): string {
  if (isBlank(u)) return "";
  return ipfsGatewayUrls(u)[0] ?? "";
}

const RETRYABLE_STATUS = new Set([301, 302, 307, 308, 429, 502, 503, 504]);

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

function asJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

async function fetchGateway(
  fetchImpl: FetchImpl,
  url: string
): Promise<Record<string, unknown> | "retry" | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (isRetryableStatus(res.status)) return "retry";
    if (!res.ok) return null;
    const json = asJsonObject(await res.text());
    return json ?? "retry";
  } catch {
    return "retry";
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetches IPFS JSON, failing over public gateways on 429/5xx.
 * Successful CID payloads are cached in-process so dev (no Next Data Cache)
 * does not re-hit rate-limited gateways.
 */
export function createIpfsJsonFetcher(fetchImpl: FetchImpl = fetch) {
  const hits = new Map<string, Record<string, unknown>>();
  const inflight = new Map<string, Promise<Record<string, unknown> | null>>();

  async function load(uri: string, key: string): Promise<Record<string, unknown> | null> {
    for (const url of ipfsGatewayUrls(uri)) {
      const result = await fetchGateway(fetchImpl, url);
      if (result === "retry") continue;
      if (result) hits.set(key, result);
      return result;
    }
    return null;
  }

  return async function fetchIpfsJson(uri: string): Promise<Record<string, unknown> | null> {
    if (!uri || uri.startsWith("data:")) return null;
    const key = ipfsCidPath(uri) ?? uri;
    const cached = hits.get(key);
    if (cached) return cached;
    const pending = inflight.get(key);
    if (pending) return pending;
    const job = load(uri, key).finally(() => inflight.delete(key));
    inflight.set(key, job);
    return job;
  };
}
