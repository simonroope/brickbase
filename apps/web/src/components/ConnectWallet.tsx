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
        <div className="hidden flex-wrap items-center gap-x-4 text-sm text-header-text sm:flex">
          <span className="truncate max-w-[140px]" title={address}>
            {`${address.slice(0, 6)}…${address.slice(-4)}`}
          </span>
          <span>{chainName}</span>
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
          className="rounded-md border border-brown-light px-3 py-1.5 text-sm text-header-text hover:bg-brown-light"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return <ConnectBtn />;
}
