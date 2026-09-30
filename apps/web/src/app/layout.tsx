import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { Header } from "@/components/Header";
import { OptimisticAssetProvider } from "@/components/OptimisticAssetProvider";
import { OptimisticAssetSlot } from "@/components/OptimisticAssetSlot";
import Web3ModalProvider from "@/context/Web3ModalProvider";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BrickBase - Trade Commercial Real Estate RWAs",
  description: "Display and trade commercial real estate Real World Assets tokenized on Ethereum",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookie = headersList.get("cookie") ?? null;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3ModalProvider cookie={cookie}>
          <OptimisticAssetProvider>
            <div className="flex min-h-screen flex-col bg-page">
              <Header />
              <div className="flex-1">
                <OptimisticAssetSlot>{children}</OptimisticAssetSlot>
              </div>
              <Footer />
            </div>
          </OptimisticAssetProvider>
        </Web3ModalProvider>
      </body>
    </html>
  );
}
