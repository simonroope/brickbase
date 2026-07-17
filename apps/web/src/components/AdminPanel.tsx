"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/hooks/useWallet";
import { setUserAllowed } from "@/lib/transactions";
import { AllowlistedUsersGrid } from "./AllowlistedUsersGrid";

export function AdminPanel() {
  const { isConnected } = useWallet();
  const queryClient = useQueryClient();
  const [allowlistAddress, setAllowlistAddress] = useState("");
  const [allowlistAllowed, setAllowlistAllowed] = useState(true);
  const [allowlistStatus, setAllowlistStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [allowlistError, setAllowlistError] = useState("");

  const handleAllowlist = async () => {
    if (!allowlistAddress || !/^0x[a-fA-F0-9]{40}$/.test(allowlistAddress)) {
      setAllowlistError("Enter a valid Ethereum address");
      setAllowlistStatus("error");
      return;
    }
    setAllowlistStatus("loading");
    setAllowlistError("");
    const result = await setUserAllowed(allowlistAddress as `0x${string}`, allowlistAllowed);
    if (result.success) {
      setAllowlistStatus("success");
      setAllowlistAddress("");
      queryClient.invalidateQueries({ queryKey: ["allowlist"] });
    } else {
      setAllowlistStatus("error");
      setAllowlistError(result.error ?? "Transaction failed");
    }
  };

  if (!isConnected) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted p-8 text-center">
        <p className="text-text-secondary">Connect your wallet to access admin functions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AllowlistedUsersGrid />

      {/* Allowlist section */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Allowlist Management</h2>
        <p className="mb-4 text-sm text-text-secondary">
          Add or remove addresses from the allowlist. Requires COMPLIANCE_OFFICER_ROLE.
        </p>
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            value={allowlistAddress}
            onChange={(e) => setAllowlistAddress(e.target.value)}
            placeholder="0x..."
            className="min-w-[320px] rounded-md border border-border-strong px-3 py-2 text-sm font-mono"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowlistAllowed}
              onChange={(e) => setAllowlistAllowed(e.target.checked)}
            />
            <span className="text-sm">Allowed</span>
          </label>
          <button
            type="button"
            onClick={handleAllowlist}
            disabled={allowlistStatus === "loading"}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {allowlistStatus === "loading" ? "Processing..." : allowlistAllowed ? "Add to Allowlist" : "Remove from Allowlist"}
          </button>
        </div>
        {allowlistStatus === "success" && (
          <p className="mt-2 text-sm text-success">Transaction successful.</p>
        )}
        {allowlistStatus === "error" && allowlistError && (
          <p className="mt-2 text-sm text-error">{allowlistError}</p>
        )}
      </div>

      {/* New property section - placeholder for vaultAsset/createAssetShares when contract supports it */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">New Property (Mint)</h2>
        <p className="mb-4 text-sm text-text-secondary">
          To create a new tokenized property, the AssetVault contract must expose a{" "}
          <code className="rounded bg-surface-elevated px-1">vaultAsset</code> (or similar) function.
          The current deployment may use a different flow (e.g. scripts or periphery contracts).
        </p>
        <p className="text-sm text-text-muted">
          After vaulting an asset in AssetVault, call{" "}
          <code className="rounded bg-surface-elevated px-1">AssetShares.createAssetShares(assetId, totalSupply, sharePrice)</code>{" "}
          — the AssetVault contract holds MINTER_ROLE and triggers this. Configure contract addresses in{" "}
          <code className="rounded bg-surface-elevated px-1">.env</code>.
        </p>
      </div>
    </div>
  );
}
