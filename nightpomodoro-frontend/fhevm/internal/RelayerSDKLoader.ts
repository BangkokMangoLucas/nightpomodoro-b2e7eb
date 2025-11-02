/**
 * Relayer SDK Loader
 * Dynamically loads Relayer SDK for production environments
 */

import type { FhevmInstance } from "./fhevmTypes";
import { FHEVM_CONSTANTS, CHAIN_PUBLIC_KEY_URLS } from "./constants";
import { fhevmStorage } from "@/utils/storage";

declare global {
  interface Window {
    relayerSDK?: any;
  }
}

let relayerSDKLoaded = false;

/**
 * Load Relayer SDK from CDN
 */
async function loadRelayerSDK(): Promise<void> {
  if (relayerSDKLoaded && window.relayerSDK) {
    return;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = FHEVM_CONSTANTS.RELAYER_SDK_CDN;
    script.async = true;
    
    script.onload = () => {
      if (window.relayerSDK) {
        relayerSDKLoaded = true;
        resolve();
      } else {
        reject(new Error("Relayer SDK not found on window object"));
      }
    };

    script.onerror = () => {
      reject(new Error("Failed to load Relayer SDK"));
    };

    document.head.appendChild(script);
  });
}

/**
 * Fetch public key for network
 */
async function fetchPublicKey(chainId: number): Promise<string> {
  // Check cache first
  const cached = fhevmStorage.getPublicKey(chainId);
  if (cached) {
    return cached;
  }

  const publicKeyUrl = CHAIN_PUBLIC_KEY_URLS[chainId];
  if (!publicKeyUrl) {
    throw new Error(`No public key URL configured for chainId ${chainId}`);
  }

  try {
    const response = await fetch(publicKeyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch public key: ${response.statusText}`);
    }

    const publicKey = await response.text();
    
    // Cache public key
    fhevmStorage.savePublicKey(publicKey.trim(), chainId);
    
    return publicKey.trim();
  } catch (error) {
    throw new Error(`Failed to fetch public key: ${error}`);
  }
}

/**
 * Create FHEVM instance using Relayer SDK
 */
export async function createFhevmRelayerInstance(
  chainId: number,
  account?: string
): Promise<FhevmInstance> {
  // Load SDK if not already loaded
  await loadRelayerSDK();

  // Get public key
  const publicKey = await fetchPublicKey(chainId);

  // Initialize Relayer SDK
  const sdk = window.relayerSDK;
  const instance = await sdk.createInstance({
    chainId,
    publicKey,
    account,
  });

  // Wrap SDK methods to match our interface
  return {
    createEncryptedInput(contractAddress: string, userAddress: string) {
      return instance.createEncryptedInput(contractAddress, userAddress);
    },

    generateKeypair() {
      return instance.generateKeypair();
    },

    createEIP712(publicKey: string, contractAddresses: string[]) {
      return instance.createEIP712(publicKey, contractAddresses);
    },

    getPublicKey(): string {
      return publicKey;
    },

    getPublicParams(size: number): string {
      return instance.getPublicParams(size);
    },

    async userDecrypt(
      requests: any[],
      privateKey: string,
      publicKey: string,
      signature: string,
      contractAddresses: `0x${string}`[],
      userAddress: string,
      startTimestamp: number,
      durationDays: number
    ): Promise<Record<string, bigint>> {
      return instance.userDecrypt(
        requests,
        privateKey,
        publicKey,
        signature,
        contractAddresses,
        userAddress,
        startTimestamp,
        durationDays
      );
    },
  };
}

