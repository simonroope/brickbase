"use client";

import React, { ReactNode } from "react";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cookieToInitialState, WagmiProvider } from "wagmi";
import { getWagmiConfig, projectId } from "@/config/wagmi";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

const wagmiConfig = getWagmiConfig();

if (!projectId) {
  console.warn(
    "WALLETCONNECT_PROJECT_ID is not set. WalletConnect may not work."
  );
}

const globalKey = "__brickbaseWeb3Modal" as const;
const globals = globalThis as typeof globalThis & { [globalKey]?: boolean };
if (!globals[globalKey]) {
  globals[globalKey] = true;
  createWeb3Modal({
    wagmiConfig,
    projectId,
    enableAnalytics: true,
    enableOnramp: true,
    customWallets: [
      {
        id: "quantum",
        name: "Quantum Wallet",
        homepage: "https://wallet.qat.xyz",
        image_url: "https://lh3.googleusercontent.com/placeholder",
        mobile_link: "quantum://",
        desktop_link:
          "https://chromewebstore.google.com/detail/quantum-wallet/ajopcimklncnhjednieoejhkffdolemp",
        webapp_link:
          "https://chromewebstore.google.com/detail/quantum-wallet/ajopcimklncnhjednieoejhkffdolemp",
        app_store: "https://apps.apple.com/kw/app/quantum-wallet/id6511246853",
        play_store:
          "https://play.google.com/store/apps/details?id=com.quantum.wallet.app",
      },
    ],
  });
}

export default function Web3ModalProvider({
  children,
  cookie,
}: {
  children: ReactNode;
  cookie: string | null;
}) {
  const initialState = cookieToInitialState(wagmiConfig, cookie ?? undefined);

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
