import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Anton, Inter } from "next/font/google";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import ClientProviders from "../components/client-providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton" });

export const metadata: Metadata = {
  title: "Linesman — Sharp line vs the market",
  description:
    "Linesman scores Polymarket and Kalshi prices against TxLINE's de-vigged sharp consensus, anchored on Solana, and audits whether World Cup markets settled correctly.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Linesman" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0A0E14",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${anton.variable}`}>
      {/* suppressHydrationWarning: some browser extensions inject data-cx-* attributes
          onto <body> before React hydrates; that mismatch is not fixable from app code. */}
      <body suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
