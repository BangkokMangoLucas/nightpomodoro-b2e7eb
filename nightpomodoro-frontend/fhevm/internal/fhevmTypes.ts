/**
 * FHEVM Type definitions
 */

export interface EncryptedInput {
  add32(value: number): EncryptedInput;
  add64(value: bigint): EncryptedInput;
  addAddress(address: string): EncryptedInput;
  addBool(value: boolean): EncryptedInput;
  encrypt(): Promise<{
    handles: string[];
    inputProof: string;
  }>;
}

export interface DecryptionRequest {
  handle: string;
  contractAddress: string;
}

export interface FhevmInstance {
  // Encryption
  createEncryptedInput(
    contractAddress: string,
    userAddress: string
  ): EncryptedInput;
  
  // Decryption
  generateKeypair(): { privateKey: string; publicKey: string };
  createEIP712(publicKey: string, contractAddresses: string[], startTimestamp: number, durationDays: number): any;
  userDecrypt(
    requests: DecryptionRequest[],
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: `0x${string}`[],
    userAddress: string,
    startTimestamp: number,
    durationDays: number
  ): Promise<Record<string, bigint>>;
  
  // Utilities
  getPublicKey(): string;
  getPublicParams(size: number): string;
}

export interface PublicKeyInfo {
  publicKey: string;
  chainId: number;
  cachedAt: number;
}

export interface DecryptionSignature {
  signature: string;
  account: string;
  timestamp: number;
}

export interface FhevmConfig {
  chainId: number;
  account?: string;
  isMock: boolean;
  rpcUrl?: string;
}

