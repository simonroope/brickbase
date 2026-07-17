"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllowlistedUsers } from "@/lib/contracts";
import type { Address } from "viem";

function formatAddress(addr: Address) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function AllowlistedUsersGrid() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["allowlist", "all"],
    queryFn: fetchAllowlistedUsers,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Allowlisted Users</h2>
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Allowlisted Users</h2>
        <p className="text-sm text-error">Failed to load allowlist.</p>
      </div>
    );
  }

  if (!users?.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Allowlisted Users</h2>
        <p className="text-sm text-text-muted">No allowlisted users yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="mb-2 text-lg font-semibold text-text-primary">Allowlisted Users</h2>
      <div className="grid grid-cols-1 gap-2">
        {users.map((address) => (
          <div
            key={address}
            className="rounded-lg border border-border-subtle bg-surface-muted/50 px-4 font-mono text-sm text-text-tertiary"
            title={address}
          >
            {formatAddress(address)}
          </div>
        ))}
      </div>
    </div>
  );
}
