# Chains

Supported chains, RPC URL construction, and public IPFS gateway URLs, imported as `@brickbase/chains`. Consumed by Web, MCP, and Events.

## Language

**SUPPORTED_CHAIN_IDS**:
The readonly tuple of chains Brickbase supports: `1` (Ethereum mainnet), `11155111` (Sepolia), `8453` (Base), `84532` (Base Sepolia). Source of the `ChainId` type.
_Avoid_: networks array, supported chains list

**getChainConfig**:
Resolves a `ChainId` to `{ rpcUrl, name }`, applying `appendProjectId` over an env URL with a public-node fallback. Returns config, not a viem `Chain`.
_Avoid_: getChain, chain definition

**appendProjectId**:
Concatenates `INFURA_PROJECT_ID` onto an RPC base URL that already ends in `/` (e.g. `https://sepolia.infura.io/v3/`). Returns the URL unchanged when the env var is unset, the URL is loopback (`localhost` / `127.0.0.1`), or the URL has no trailing slash (public RPC / Hardhat).
_Avoid_: build RPC URL, add key (it inserts no separator and no `?key=`)

**RPC_URL**:
This environment's JSON-RPC base — local Hardhat, staging Sepolia, production mainnet, or Base. The Infura hostname selects the chain; `INFURA_PROJECT_ID` is shared across chains. Always a base URL ending in `/` for Infura; never a complete keyed URL. One value per environment.
_Avoid_: `ETHEREUM_RPC_URL`, `BASE_RPC_URL`, normalising or trimming the trailing slash

**toIpfsGatewayUrl**:
Rewrites `ipfs://`, bare CIDs, Pinata dedicated-gateway URLs, and `*/ipfs/{cid}` gateway URLs to `https://gateway.pinata.cloud/ipfs/{cid}` for display (photos). HTTP(S) URLs that are not IPFS pass through unchanged.
_Avoid_: fetching from a Pinata dedicated (`*.mypinata.cloud`) gateway

**ipfsGatewayUrls**:
The public-gateway list for one CID (`gateway.pinata.cloud`, then `w3s.link`, then `ipfs.io`) so metadata fetch can fail over on HTTP 429. Protocol Labs HTTP gateways (`ipfs.io`, `dweb.link`) currently reject browser/server fetches.
_Avoid_: treating `ipfs.io` as the primary origin

**createIpfsJsonFetcher**:
Fetches metadata JSON by CID, trying `ipfsGatewayUrls` in order and caching a successful body in-process.
_Avoid_: `cache: "force-cache"` of gateway error responses (a 429 would stick)

**INFURA_PROJECT_ID**:
The Infura key appended at runtime — a server-only secret (sourced from AWS SSM), never baked into the RPC URL. Events uses it for staging/production `newHeads`; local Hardhat does not need it.
_Avoid_: Infura API key baked into the URL
