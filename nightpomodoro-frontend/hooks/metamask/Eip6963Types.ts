/**
 * EIP-6963: Multi Injected Provider Discovery
 * Type definitions
 */

export interface EIP1193Provider {
  isStatus?: boolean;
  host?: string;
  path?: string;
  sendAsync?: (
    request: { method: string; params?: Array<unknown> },
    callback: (error: Error | null, response: unknown) => void
  ) => void;
  send?: (
    request: { method: string; params?: Array<unknown> },
    callback: (error: Error | null, response: unknown) => void
  ) => void;
  request: (request: { method: string; params?: Array<unknown> }) => Promise<unknown>;
}

export interface EIP6963ProviderInfo {
  rdns: string;
  uuid: string;
  name: string;
  icon: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

export type EIP6963AnnounceProviderEvent = CustomEvent<EIP6963ProviderDetail>;

export interface WalletState {
  provider: EIP1193Provider | null;
  providerInfo: EIP6963ProviderInfo | null;
  account: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: Error | null;
}

