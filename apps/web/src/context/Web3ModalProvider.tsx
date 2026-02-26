"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cookieToInitialState } from "wagmi";
import { WagmiProvider } from "wagmi";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

export default function Web3ModalProvider({
  children,
  cookie,
}: {
  children: ReactNode;
  cookie: string | null;
}) {
  const [config, setConfig] = useState<Awaited<ReturnType<typeof import("@/config/wagmi").getWagmiConfig>> | null>(null);

  useEffect(() => {
    import("@/config/wagmi").then(({ getWagmiConfig, projectId }) => {
      if (!projectId) {
        console.warn(
          "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect may not work."
        );
      }
      const cfg = getWagmiConfig();
      setConfig(cfg);
      const key = "__web3ModalInitialized";
      if (typeof window !== "undefined" && projectId && !(window as unknown as { [key: string]: boolean })[key]) {
        (window as unknown as { [key: string]: boolean })[key] = true;
        createWeb3Modal({
          wagmiConfig: cfg,
          projectId,
          enableAnalytics: true,
          enableOnramp: true,
        });
      }
    });
  }, []);

  if (!config) {
    return (
      <div className="min-h-screen bg-zinc-50 antialiased flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading...</div>
      </div>
    );
  }

  const initialState = cookieToInitialState(config, cookie ?? undefined);

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
