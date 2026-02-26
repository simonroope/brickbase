"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWhitelistedUsers } from "@/lib/contracts";
import type { Address } from "viem";

function formatAddress(addr: Address) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WhitelistedUsersGrid() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["whitelist", "all"],
    queryFn: fetchWhitelistedUsers,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Whitelisted Users</h2>
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Whitelisted Users</h2>
        <p className="text-sm text-red-600">Failed to load whitelist.</p>
      </div>
    );
  }

  if (!users?.length) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Whitelisted Users</h2>
        <p className="text-sm text-zinc-500">No whitelisted users yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6">
      <h2 className="mb-2 text-lg font-semibold text-zinc-900">Whitelisted Users</h2>
      <div className="grid grid-cols-1 gap-2">
        {users.map((address) => (
          <div
            key={address}
            className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 font-mono text-sm text-zinc-700"
            title={address}
          >
            {formatAddress(address)}
          </div>
        ))}
      </div>
    </div>
  );
}
