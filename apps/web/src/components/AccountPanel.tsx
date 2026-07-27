"use client";

import { useWallet } from "@/hooks/useWallet";
import ConnectBtn from "./ConnectBtn";

export function AccountPanel() {
  const { address, isConnected } = useWallet();

  if (!isConnected || !address) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted p-8 text-center">
        <p className="mb-4 text-text-secondary">Connect your wallet to view your account.</p>
        <ConnectBtn />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <p className="mb-1 text-sm text-text-secondary">Wallet address</p>
      <p className="font-mono break-all text-text-primary">{address}</p>
    </div>
  );
}
