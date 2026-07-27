"use client";

import { useWallet } from "@/hooks/useWallet";
import ConnectBtn from "./ConnectBtn";

export function AccountPanel() {
  const { address, isConnected } = useWallet();

  if (!isConnected || !address) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted p-8 text-center">
        <p className="text-text-secondary">Connect your wallet to view your account.</p>
        <div className="mt-4 flex justify-center">
          <ConnectBtn />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-text-secondary">Wallet address:</dt>
        <dd className="break-all font-mono">{address}</dd>
      </dl>
    </div>
  );
}
