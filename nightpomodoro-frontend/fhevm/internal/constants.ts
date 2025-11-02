/**
 * FHEVM Constants
 */

export const FHEVM_CONSTANTS = {
  // Relayer SDK URL (UMD format for v0.3.0-5)
  RELAYER_SDK_CDN: "https://cdn.zama.org/relayer-sdk-js/0.3.0-5/relayer-sdk-js.umd.cjs",
  RELAYER_SDK_LOCAL: "/relayer-sdk-js.umd.cjs",
  
  // Public key cache duration (24 hours)
  PUBLIC_KEY_CACHE_DURATION: 24 * 60 * 60 * 1000,
  
  // Decryption signature validity (7 days)
  DECRYPTION_SIGNATURE_VALIDITY: 7 * 24 * 60 * 60 * 1000,
} as const;

export const CHAIN_PUBLIC_KEY_URLS: Record<number, string> = {
  11155111: "https://keys.zama.org/11155111/",  // Sepolia (updated to .org for v0.9)
  // Localhost uses fhevmTemp directory
};

