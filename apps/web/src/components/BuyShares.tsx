"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { purchaseShares } from "@/lib/transactions";
import { isUserWhitelisted } from "@/lib/contracts";
import { useQuery } from "@tanstack/react-query";
import { formatInt, formatUsdc } from "@/lib/format";

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
    if (whitelisted === false) {
      setErrorMessage("Your address is not on the whitelist. Contact the compliance officer to be added.");
      setStatus("error");
      return;
    }
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
      <p className="text-sm text-warning">Connect your wallet to purchase shares.</p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <input
          type="number"
          min="1"
          max={availableSupply.toString()}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Number of shares"
          className="rounded-md border border-border-strong px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handlePurchase}
          disabled={status === "loading" || !amount || BigInt(amount || "0") <= BigInt(0)}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {status === "loading" ? "Processing..." : "Buy Shares"}
        </button>
      </div>
      {totalCost > BigInt(0) && (
        <p className="mt-2 text-sm text-text-secondary">Total cost: {formatInt(totalCost)} USDC</p>
      )}
      {status === "success" && (
        <p className="mt-2 text-sm text-success">Purchase successful!</p>
      )}
      {status === "error" && errorMessage && (
        <p className="mt-2 text-sm text-error">{errorMessage}</p>
      )}
    </div>
  );
}
