"use client";

import { useConnection, useDisconnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";

/**
 * Wallet state and actions (address, connection status, connect, disconnect).
 * Uses wagmi + Web3Modal under the hood.
 */
export function useWallet() {
  const { address, isConnected } = useConnection();
  const { mutate: disconnect } = useDisconnect();
  const { open } = useWeb3Modal();

  return {
    address: address ?? null,
    isConnected,
    connect: () => open(),
    disconnect: () => disconnect(),
  };
}
