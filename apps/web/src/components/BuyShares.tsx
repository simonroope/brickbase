"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { purchaseShares } from "@/lib/transactions";
import { isUserWhitelisted } from "@/lib/contracts";
import { useQuery } from "@tanstack/react-query";
import { formatInt, formatNum, formatUsdc } from "@/lib/format";

type BuySharesProps = {
  assetId: number;
  sharePrice: bigint;
  availableSupply: bigint;
};

export function BuyShares({ assetId, sharePrice, availableSupply }: BuySharesProps) {
  const { address, isConnected } = useWallet();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const { data: whitelisted } = useQuery({
    queryKey: ["whitelist", address],
    queryFn: () => (address ? isUserWhitelisted(address as `0x${string}`) : Promise.resolve(false)),
    enabled: !!address,
  });

  const handlePurchase = async () => {
    if (!address || !amount || BigInt(amount) <= BigInt(0)) return;
    const numAmount = BigInt(amount);
    if (numAmount > availableSupply) {
      setErrorMessage("Amount exceeds available supply");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    const result = await purchaseShares(address as `0x${string}`, assetId, numAmount, sharePrice);
    if (result.success) {
      setStatus("success");
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    } else {
      setStatus("error");
      setErrorMessage(result.error ?? "Purchase failed");
    }
  };

  const totalCost = amount && BigInt(amount) > BigInt(0)
    ? (BigInt(amount) * sharePrice) / BigInt(1e18)
    : BigInt(0);

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-amber-800">Connect your wallet to purchase shares.</p>
      </div>
    );
  }

  if (whitelisted === false) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-amber-800">Your address is not on the whitelist. Contact the compliance officer to be added.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900">Purchase Shares</h3>
      <p className="mb-2 text-sm text-zinc-600">
        Share price: {formatUsdc(sharePrice)} | Available: {formatNum(availableSupply)}
      </p>
      <div className="flex flex-wrap gap-4">
        <input
          type="number"
          min="1"
          max={availableSupply.toString()}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Number of shares"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handlePurchase}
          disabled={status === "loading" || !amount || BigInt(amount || "0") <= BigInt(0)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {status === "loading" ? "Processing..." : "Buy Shares"}
        </button>
      </div>
      {totalCost > BigInt(0) && (
        <p className="mt-2 text-sm text-zinc-600">Total cost: {formatInt(totalCost)} USDC</p>
      )}
      {status === "success" && (
        <p className="mt-2 text-sm text-green-600">Purchase successful!</p>
      )}
      {status === "error" && errorMessage && (
        <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
