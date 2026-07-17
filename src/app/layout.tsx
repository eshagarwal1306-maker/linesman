import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import AppProviders from "../components/app-providers";

export const metadata: Metadata = {
  title: "TxLINE Starter",
  description: "A network-isolated Solana foundation for TxLINE integrations.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
