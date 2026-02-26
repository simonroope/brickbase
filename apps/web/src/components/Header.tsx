"use client";

import Link from "next/link";
import { ConnectWallet } from "./ConnectWallet";
import { OraclePrices } from "./OraclePrices";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-zinc-900">
            Property Assets
          </Link>
          <nav className="flex gap-4">
            <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              Properties
            </Link>
            <Link href="/asset-admin" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
              Admin
            </Link>
          </nav>
        </div>
        <ConnectWallet />
      </div>
      <div className="flex justify-center border-t border-zinc-100 bg-zinc-50/50 px-4 py-2">
        <OraclePrices />
      </div>
    </header>
  );
}
