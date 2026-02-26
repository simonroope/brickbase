"use client";

import { formatUnits } from "viem";
import { useBalance, useChainId } from "wagmi";
import { chains } from "@/config/wagmi";
import { useWallet } from "@/hooks/useWallet";
import ConnectBtn from "./ConnectBtn";

export function ConnectWallet() {
  const { address, isConnected, disconnect } = useWallet();
  const chainId = useChainId();
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address: address ?? undefined,
    query: { enabled: !!address },
  });
  const chainName =
    chains.find((c) => c.id === chainId)?.name ?? `Chain ${chainId}`;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="hidden flex-wrap items-center gap-x-4 text-sm text-zinc-600 sm:flex">
          <span className="text-zinc-600 truncate max-w-[140px]" title={address}>
            {`${address.slice(0, 6)}…${address.slice(-4)}`}
          </span>
          <span className="text-zinc-600">{chainName}</span>
          <span>
            {balanceLoading
              ? "…"
              : balance != null
                ? `${Number(formatUnits(balance.value, balance.decimals)).toFixed(4)} ${balance.symbol}`
                : "—"}
          </span>
        </div>
        <button
          type="button"
          onClick={disconnect}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return <ConnectBtn />;
}
