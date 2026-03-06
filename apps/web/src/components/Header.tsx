"use client";

import Link from "next/link";
import { ConnectWallet } from "./ConnectWallet";
import { OraclePrices } from "./OraclePrices";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-brown-light bg-brown">
      <div className="mx-auto grid max-w-7xl grid-cols-3 items-center px-4 py-4">
        <nav className="flex gap-4">
          <Link href="/" className="text-sm font-medium text-header-text hover:text-white">
            Properties
          </Link>
          <Link href="/asset-admin" className="text-sm font-medium text-header-text hover:text-white">
            Admin
          </Link>
        </nav>
        <div className="flex justify-center">
          <Link href="/" className="text-xl font-bold text-brand">
            BrickBase
          </Link>
        </div>
        <div className="flex justify-end">
          <ConnectWallet />
        </div>
      </div>
      <div className="flex justify-center border-t border-brown-light bg-brown-dark px-4 py-2">
        <OraclePrices />
      </div>
    </header>
  );
}
