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
      <div className="flex items-center gap-3">
        <p className="font-mono break-all text-text-primary">{address}</p>
        <button
          type="button"
          aria-label="Copy address"
          onClick={() => navigator.clipboard.writeText(address)}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-sm text-text-secondary hover:text-text-primary"
        >
          Copy
        </button>
      </div>
    </div>
  );
}
