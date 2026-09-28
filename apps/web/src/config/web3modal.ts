"use client";

import { createWeb3Modal } from "@web3modal/wagmi/react";
import { getWagmiConfig, projectId } from "@/config/wagmi";

export const wagmiConfig = getWagmiConfig();

if (!projectId) {
  console.warn(
    "WALLETCONNECT_PROJECT_ID is not set. WalletConnect may not work."
  );
}

createWeb3Modal({
  wagmiConfig,
  projectId,
  enableAnalytics: true,
  enableOnramp: true,
  customWallets: [
    {
      id: "quantum",
      name: "Quantum Wallet",
      homepage: "https://wallet.qat.xyz",
      image_url: "https://lh3.googleusercontent.com/placeholder",
      mobile_link: "quantum://",
      desktop_link:
        "https://chromewebstore.google.com/detail/quantum-wallet/ajopcimklncnhjednieoejhkffdolemp",
      webapp_link:
        "https://chromewebstore.google.com/detail/quantum-wallet/ajopcimklncnhjednieoejhkffdolemp",
      app_store: "https://apps.apple.com/kw/app/quantum-wallet/id6511246853",
      play_store:
        "https://play.google.com/store/apps/details?id=com.quantum.wallet.app",
    },
  ],
});
