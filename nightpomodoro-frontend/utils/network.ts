/**
 * Network configuration for NightPomodoro
 */

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer?: string;
  isMock: boolean;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  localhost: {
    chainId: 31337,
    name: "Hardhat Local",
    rpcUrl: "http://localhost:8545",
    isMock: true,
  },
  sepolia: {
    chainId: 11155111,
    name: "Sepolia Testnet",
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_KEY",
    blockExplorer: "https://sepolia.etherscan.io",
    isMock: false,
  },
};

export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return Object.values(NETWORKS).find((network) => network.chainId === chainId);
}

export function isSupportedNetwork(chainId: number): boolean {
  return Object.values(NETWORKS).some((network) => network.chainId === chainId);
}

export function isMockNetwork(chainId: number): boolean {
  const network = getNetworkByChainId(chainId);
  return network?.isMock ?? false;
}

export const SUPPORTED_CHAIN_IDS = Object.values(NETWORKS).map((n) => n.chainId);

