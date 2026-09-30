import type { NextConfig } from "next";
import path from "path";
import { config as loadDotenv } from "dotenv";
import { appendProjectId } from "@brickbase/chains";
import { resolveDeployedAddress } from "./src/lib/deployedAddresses";

const monorepoRoot = path.resolve(__dirname, "../..");
loadDotenv({ path: path.resolve(monorepoRoot, ".env") });

const nextConfig: NextConfig = {
  output: "standalone",
  // Expose canonical env var names to the browser bundle at build time.
  // ETHEREUM_RPC_URL is the base URL; INFURA_PROJECT_ID appended via shared-config.
  env: {
    APP_URL: process.env.APP_URL ?? "",
    CHAIN_ID: process.env.CHAIN_ID ?? "",
    ETHEREUM_RPC_URL: appendProjectId(process.env.ETHEREUM_RPC_URL ?? ""),
    ASSET_VAULT_ADDRESS: resolveDeployedAddress("ASSET_VAULT_ADDRESS"),
    ASSET_SHARES_ADDRESS: resolveDeployedAddress("ASSET_SHARES_ADDRESS"),
    ORACLE_ROUTER_ADDRESS: resolveDeployedAddress("ORACLE_ROUTER_ADDRESS"),
    USER_ALLOWLIST_ADDRESS: resolveDeployedAddress("USER_ALLOWLIST_ADDRESS"),
    USDC_ADDRESS: resolveDeployedAddress("USDC_ADDRESS"),
    WALLETCONNECT_PROJECT_ID: process.env.WALLETCONNECT_PROJECT_ID ?? "",
    WS_LIVE_URL: process.env.WS_LIVE_URL ?? "",
  },
  // Monorepo: trace deps from repo root (avoids multi-lockfile root warning)
  outputFileTracingRoot: monorepoRoot,
  turbopack: {},
  experimental: {
    // Keep a short client-router cache so Back / Buy Shares is not a full RSC refetch.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  images: {
    // IPFS CIDs are immutable; keep optimised photos in the Next image cache.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "gateway.pinata.cloud", pathname: "/ipfs/**" },
      { protocol: "https", hostname: "w3s.link", pathname: "/ipfs/**" },
      { protocol: "https", hostname: "dweb.link", pathname: "/ipfs/**" },
      { protocol: "https", hostname: "ipfs.io", pathname: "/**" },
      { protocol: "https", hostname: "cloudflare-ipfs.com", pathname: "/**" },
    ],
  },
  webpack: (config) => {
    // Stub React Native async-storage so MetaMask SDK browser build doesn't fail
    const root = monorepoRoot;
    config.resolve.alias = {
      ...config.resolve.alias,
      "@brickbase/abi": path.resolve(root, "contracts/abi/src/index.ts"),
      "@brickbase/chains": path.resolve(root, "contracts/chains/index.ts"),
      "@brickbase/events-types": path.resolve(
        root,
        "apps/events/types/index.ts"
      ),
      // MCP contracts.ts imports contracts/abi via relative path
      [path.resolve(root, "contracts/abi/src/index.js")]: path.resolve(
        root,
        "contracts/abi/src/index.ts"
      ),
      "@react-native-async-storage/async-storage": path.resolve(
        __dirname,
        "src/lib/async-storage-stub.js"
      ),
    };
    // Stub optional wallet connector SDKs (not all projects install these)
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@coinbase/wallet-sdk": false,
      "@metamask/sdk": false,
      "@base-org/account": false,
      "@safe-global/safe-apps-sdk": false,
      "@safe-global/safe-apps-provider": false,
      porto: false,
    };
    return config;
  },
};

export default nextConfig;
