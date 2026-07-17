export type Network = "devnet" | "mainnet";

export type NetworkConfig = Readonly<{
  network: Network;
  rpcUrl: string;
  apiOrigin: string;
  programId: string;
  txlMint: string;
  serviceLevels: readonly number[];
}>;

const configs: Record<Network, NetworkConfig> = {
  devnet: {
    network: "devnet",
    rpcUrl:
      process.env.NEXT_PUBLIC_DEVNET_RPC_URL ??
      "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
    txlMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
    serviceLevels: [1],
  },
  mainnet: {
    network: "mainnet",
    rpcUrl:
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL ??
      "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    programId: "9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA",
    txlMint: "Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL",
    serviceLevels: [1, 12],
  },
};

export function getNetworkConfig(network: Network): NetworkConfig {
  return configs[network];
}
