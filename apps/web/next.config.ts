import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "ipfs.io", pathname: "/**" },
      { protocol: "https", hostname: "cloudflare-ipfs.com", pathname: "/**" },
      { protocol: "https", hostname: "ivory-independent-bison-569.mypinata.cloud", pathname: "/**" },
    ],
  },
  webpack: (config) => {
    // Stub React Native async-storage so MetaMask SDK browser build doesn't fail
    config.resolve.alias = {
      ...config.resolve.alias,
      "@brickbase/abi": path.resolve(__dirname, "../../libs/abi/src/index.ts"),
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
