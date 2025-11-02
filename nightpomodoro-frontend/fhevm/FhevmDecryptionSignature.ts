/**
 * FHEVM Decryption Signature Management
 * Based on frontend/fhevm/FhevmDecryptionSignature.ts
 */

import { ethers } from "ethers";
import type { FhevmInstance } from "./fhevmTypes";

export interface DecryptionSignatureData {
  privateKey: string;
  publicKey: string;
  signature: string;
  contractAddresses: string[];
  userAddress: string;
  startTimestamp: number;
  durationDays: number;
}

export interface GenericStringStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
}

export class FhevmDecryptionSignature {
  private constructor(
    public readonly privateKey: string,
    public readonly publicKey: string,
    public readonly signature: string,
    public readonly contractAddresses: string[],
    public readonly userAddress: string,
    public readonly startTimestamp: number,
    public readonly durationDays: number
  ) {}

  /**
   * Create a new decryption signature (no caching)
   * Each call will generate a fresh signature that requires user approval
   */
  static async loadOrSign(
    instance: FhevmInstance,
    contractAddresses: `0x${string}`[],
    signer: ethers.JsonRpcSigner,
    storage?: GenericStringStorage // Optional, not used but kept for API compatibility
  ): Promise<FhevmDecryptionSignature | null> {
    try {
      const userAddress = await signer.getAddress();

      // Always generate new signature (no cache lookup)
      const { privateKey, publicKey } = instance.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
      const durationDays = 7; // 7 days validity
      const eip712 = instance.createEIP712(publicKey, contractAddresses, startTimestamp, durationDays);
      
      // Remove EIP712Domain from types if present - ethers.js doesn't allow it in the types object
      const typesWithoutDomain = { ...eip712.types };
      if ('EIP712Domain' in typesWithoutDomain) {
        delete (typesWithoutDomain as any).EIP712Domain;
      }
      
      // Request user signature (will show MetaMask popup each time)
      const signature = await signer.signTypedData(
        eip712.domain,
        typesWithoutDomain,
        eip712.message
      );

      return new FhevmDecryptionSignature(
        privateKey,
        publicKey,
        signature,
        contractAddresses,
        userAddress,
        startTimestamp,
        durationDays
      );
    } catch (error) {
      console.error("Failed to create decryption signature:", error);
      return null;
    }
  }
}

