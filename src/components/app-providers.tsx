"use client";

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

export function useNetwork(): NetworkContextValue {
  const value = useContext(NetworkContext);

  if (!value) {
    throw new Error("useNetwork must be used within NetworkProvider");
  }

  return value;
}

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setActiveNetwork] = useState<Network>("devnet");
  const setNetwork = useCallback((nextNetwork: Network) => {
    setActiveNetwork(nextNetwork);
  }, []);
  const value = useMemo(
    () => ({ network, setNetwork }),
    [network, setNetwork],
  );
  const { rpcUrl } = getNetworkConfig(network);

  return (
    <NetworkContext.Provider value={value}>
      <ConnectionProvider key={network} endpoint={rpcUrl}>
        <WalletProvider wallets={[]} autoConnect>
          <WalletModalProvider>
            <div key={network}>{children}</div>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </NetworkContext.Provider>
  );
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return <NetworkProvider>{children}</NetworkProvider>;
}
