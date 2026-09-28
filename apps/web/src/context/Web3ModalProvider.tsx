"use client";

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cookieToInitialState, WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/config/web3modal";

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
  const initialState = cookieToInitialState(wagmiConfig, cookie ?? undefined);

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
