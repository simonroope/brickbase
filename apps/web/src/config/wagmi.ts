import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { defineChain } from "viem";
import { cookieStorage, createStorage } from "wagmi";
import { mainnet, sepolia, base, baseSepolia } from "wagmi/chains";

const localhost = defineChain({
  id: 31337,
  name: "Localhost",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1:8545"] } },
});

// WalletConnect Cloud project ID
export const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const metadata = {
  name: "Property Assets",
  description: "Trade commercial real estate Real World Assets on Ethereum",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

export const chains = [localhost, mainnet, sepolia, base, baseSepolia] as const;

let _config: ReturnType<typeof defaultWagmiConfig> | null = null;

/** Lazy config creation—avoids indexedDB access during SSR. Call from client only. */
export function getWagmiConfig() {
  if (!_config) {
    _config = defaultWagmiConfig({
      chains,
      projectId,
      metadata,
      ssr: true,
      auth: {
        socials: ["x", "google", "github", "discord", "apple"],
        showWallets: true,
      },
      storage: createStorage({
        storage: cookieStorage,
      }),
    });
  }
  return _config;
}
