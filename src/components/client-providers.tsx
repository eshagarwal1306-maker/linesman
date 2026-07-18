"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const AppProviders = dynamic(() => import("./app-providers"), {
  ssr: false,
  loading: () => null,
});

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
