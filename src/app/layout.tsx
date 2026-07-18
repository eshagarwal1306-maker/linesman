import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import ClientProviders from "../components/client-providers";

export const metadata: Metadata = {
  title: "TxLINE Starter",
  description: "A network-isolated Solana foundation for TxLINE integrations.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
