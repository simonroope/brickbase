"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { setUserAllowed } from "@/lib/transactions";
import { WhitelistedUsersGrid } from "./WhitelistedUsersGrid";

export function AdminPanel() {
  const { isConnected } = useWallet();
  const queryClient = useQueryClient();
  const [whitelistAddress, setWhitelistAddress] = useState("");
  const [whitelistAllowed, setWhitelistAllowed] = useState(true);
  const [whitelistStatus, setWhitelistStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [whitelistError, setWhitelistError] = useState("");

  const handleWhitelist = async () => {
    if (!whitelistAddress || !/^0x[a-fA-F0-9]{40}$/.test(whitelistAddress)) {
      setWhitelistError("Enter a valid Ethereum address");
      setWhitelistStatus("error");
      return;
    }
    setWhitelistStatus("loading");
    setWhitelistError("");
    const result = await setUserAllowed(whitelistAddress as `0x${string}`, whitelistAllowed);
    if (result.success) {
      setWhitelistStatus("success");
      setWhitelistAddress("");
      queryClient.invalidateQueries({ queryKey: ["whitelist"] });
    } else {
      setWhitelistStatus("error");
      setWhitelistError(result.error ?? "Transaction failed");
    }
  };

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center">
        <p className="text-zinc-600">Connect your wallet to access admin functions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <WhitelistedUsersGrid />

      {/* Whitelist section */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Whitelist Management</h2>
        <p className="mb-4 text-sm text-zinc-600">
          Add or remove addresses from the allowlist. Requires COMPLIANCE_OFFICER_ROLE.
        </p>
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            value={whitelistAddress}
            onChange={(e) => setWhitelistAddress(e.target.value)}
            placeholder="0x..."
            className="min-w-[320px] rounded-md border border-zinc-300 px-3 py-2 text-sm font-mono"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={whitelistAllowed}
              onChange={(e) => setWhitelistAllowed(e.target.checked)}
            />
            <span className="text-sm">Allowed</span>
          </label>
          <button
            type="button"
            onClick={handleWhitelist}
            disabled={whitelistStatus === "loading"}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {whitelistStatus === "loading" ? "Processing..." : whitelistAllowed ? "Add to Whitelist" : "Remove from Whitelist"}
          </button>
        </div>
        {whitelistStatus === "success" && (
          <p className="mt-2 text-sm text-green-600">Transaction successful.</p>
        )}
        {whitelistStatus === "error" && whitelistError && (
          <p className="mt-2 text-sm text-red-600">{whitelistError}</p>
        )}
      </div>

      {/* New property section - placeholder for vaultAsset/createAssetShares when contract supports it */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">New Property (Mint)</h2>
        <p className="mb-4 text-sm text-zinc-600">
          To create a new tokenized property, the AssetVault contract must expose a{" "}
          <code className="rounded bg-zinc-100 px-1">vaultAsset</code> (or similar) function.
          The current deployment may use a different flow (e.g. scripts or periphery contracts).
        </p>
        <p className="text-sm text-zinc-500">
          After vaulting an asset in AssetVault, call{" "}
          <code className="rounded bg-zinc-100 px-1">AssetShares.createAssetShares(assetId, totalSupply, sharePrice)</code>{" "}
          — the AssetVault contract holds MINTER_ROLE and triggers this. Configure contract addresses in{" "}
          <code className="rounded bg-zinc-100 px-1">.env</code>.
        </p>
      </div>
    </div>
  );
}
