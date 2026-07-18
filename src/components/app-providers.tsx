"use client";

import { WalletError } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getNetworkConfig,
  type Network,
} from "../lib/network/config";

type NetworkContextValue = {
  network: Network;
  setNetwork: (network: Network) => void;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);
const WALLET_STORAGE_KEY = "txline_wallet_name";

export function useNetwork(): NetworkContextValue {
  const value = useContext(NetworkContext);

  if (!value) {
    throw new Error("useNetwork must be used within NetworkProvider");
  }

  return value;
}

function clearStoredWallet() {
  try {
    window.localStorage.removeItem(WALLET_STORAGE_KEY);
    // Also clear the adapter default key in case an older build wrote it.
    window.localStorage.removeItem("walletName");
  } catch {
    // ignore storage failures
  }
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Clear sticky auto-reconnect before WalletProvider mounts so Phantom is not
  // prompted during page load (that race surfaces as WalletConnectionError).
  useState(() => {
    if (typeof window !== "undefined") clearStoredWallet();
    return true;
  });

  const [network, setActiveNetwork] = useState<Network>("devnet");
  const setNetwork = useCallback((nextNetwork: Network) => {
    setActiveNetwork(nextNetwork);
  }, []);
  const value = useMemo(
    () => ({ network, setNetwork }),
    [network, setNetwork],
  );
  const { rpcUrl } = getNetworkConfig(network);
  const endpoint = useMemo(() => rpcUrl, [rpcUrl]);
  // Empty list: Wallet Standard discovers Phantom without a second legacy adapter.
  const wallets = useMemo(() => [], []);

  const onError = useCallback((error: WalletError) => {
    if (
      error.name === "WalletConnectionError" ||
      error.name === "WalletNotReadyError" ||
      error.name === "WalletDisconnectedError"
    ) {
      clearStoredWallet();
      console.warn("[wallet]", error.message || error.name);
      return;
    }
    console.error("[wallet]", error);
  }, []);

  return (
    <NetworkContext.Provider value={value}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider
          wallets={wallets}
          autoConnect
          localStorageKey={WALLET_STORAGE_KEY}
          onError={onError}
        >
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  );
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return <NetworkProvider>{children}</NetworkProvider>;
}
