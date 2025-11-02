"use client";

/**
 * Decryption Hook
 * Handles user decryption requests and signature management
 */

import { useState, useCallback } from "react";
import { useWallet } from "./useWallet";
import { getFhevmInstance } from "@/fhevm/internal/fhevm";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { LocalStorageAdapter } from "@/fhevm/GenericStringStorage";
import { ethers } from "ethers";

export function useDecryption() {
  const { provider, account } = useWallet();
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Request decryption signature from user (following reference project pattern)
  const requestDecryptionSignature = useCallback(
    async (contractAddresses: `0x${string}`[]): Promise<FhevmDecryptionSignature | null> => {
      if (!provider || !account) {
        throw new Error("Wallet not connected");
      }

      try {
        const instance = getFhevmInstance();
        const ethersProvider = new ethers.BrowserProvider(provider as any);
        const signer = await ethersProvider.getSigner();
        const storage = new LocalStorageAdapter();

        const signature = await FhevmDecryptionSignature.loadOrSign(
          instance as any, // Type cast to bypass interface mismatch
          contractAddresses,
          signer,
          storage
        );

        return signature;
      } catch (error) {
        console.error("Failed to get decryption signature:", error);
        throw error;
      }
    },
    [provider, account]
  );

  // Decrypt value (following reference project pattern)
  const decryptValue = useCallback(
    async (
      handle: string,
      contractAddress: string
    ): Promise<bigint | null> => {
      if (!account) {
        throw new Error("Wallet not connected");
      }

      setIsDecrypting(true);
      setError(null);

      try {
        const instance = getFhevmInstance();

        // Get decryption signature
        const sig = await requestDecryptionSignature([contractAddress as `0x${string}`]);
        if (!sig) {
          throw new Error("Unable to get decryption signature");
        }

        // Decrypt using userDecrypt
        console.log("useDecryption: Decrypting handle:", handle, "contract:", contractAddress);
        console.log("useDecryption: Signature info:", {
          privateKey: sig.privateKey.substring(0, 20) + "...",
          publicKey: sig.publicKey.substring(0, 20) + "...",
          signature: sig.signature.substring(0, 20) + "...",
          contractAddresses: sig.contractAddresses,
          userAddress: sig.userAddress,
          startTimestamp: sig.startTimestamp,
          durationDays: sig.durationDays,
        });
        
        let result;
        try {
          result = await instance.userDecrypt(
            [{ handle, contractAddress }],
            sig.privateKey,
            sig.publicKey,
            sig.signature,
            sig.contractAddresses as `0x${string}`[],
            sig.userAddress,
            sig.startTimestamp,
            sig.durationDays
          );
          console.log("useDecryption: userDecrypt completed successfully");
        } catch (decryptError) {
          console.error("useDecryption: userDecrypt failed:", decryptError);
          throw decryptError;
        }
        
        console.log("useDecryption: userDecrypt result:", result);
        console.log("useDecryption: result type:", typeof result);
        console.log("useDecryption: result is array:", Array.isArray(result));
        console.log("useDecryption: result keys:", Object.keys(result || {}));
        console.log("useDecryption: Looking for handle:", handle);
        console.log("useDecryption: result[handle]:", result?.[handle]);
        
        if (!result) {
          console.warn("useDecryption: Result is null or undefined");
          return null;
        }
        
        // userDecrypt returns results with handles as keys, but handles may be normalized
        // Try multiple formats to find the value
        const keys = Object.keys(result);
        console.log("useDecryption: All result keys:", keys);
        
        // Try exact match first
        if (result[handle] !== undefined && result[handle] !== null) {
          console.log("useDecryption: Found exact match:", result[handle]);
          return result[handle];
        }
        
        // Try case variations
        const lowerHandle = handle.toLowerCase();
        const upperHandle = handle.toUpperCase();
        if (result[lowerHandle] !== undefined && result[lowerHandle] !== null) {
          console.log("useDecryption: Found lowercase match:", result[lowerHandle]);
          return result[lowerHandle];
        }
        if (result[upperHandle] !== undefined && result[upperHandle] !== null) {
          console.log("useDecryption: Found uppercase match:", result[upperHandle]);
          return result[upperHandle];
        }
        
        // Try to find by comparing handle strings (normalize both)
        const normalizedHandle = handle.toLowerCase().replace(/^0x/, '');
        for (const key of keys) {
          const normalizedKey = key.toLowerCase().replace(/^0x/, '');
          // Compare the last part of the handle (the actual encrypted data part)
          // Handles have format: 0x...<type><data>
          if (normalizedHandle.slice(-32) === normalizedKey.slice(-32)) {
            console.log("useDecryption: Found by partial match, key:", key, "value:", result[key]);
            return result[key];
          }
        }
        
        // If still not found, use the first value (should only be one handle in the request)
        if (keys.length === 1) {
          const firstKey = keys[0];
          const firstValue = result[firstKey];
          console.log("useDecryption: Using single result, key:", firstKey, "value:", firstValue);
          return firstValue;
        }
        
        console.warn("useDecryption: No value found in result, result:", result, "handle:", handle);
        return null;
      } catch (error) {
        console.error("useDecryption: Error in decryptValue:", error);
        setError(error as Error);
        return null;
      } finally {
        setIsDecrypting(false);
      }
    },
    [account, requestDecryptionSignature]
  );

  // Clear cached signature
  const clearSignature = useCallback(() => {
    if (account && typeof window !== "undefined") {
      const storageKey = `fhevm.decryptionSignature.${account}`;
      localStorage.removeItem(storageKey);
    }
  }, [account]);

  return {
    requestDecryptionSignature,
    decryptValue,
    clearSignature,
    isDecrypting,
    isReady: !!(provider && account), // Export ready state
    error,
  };
}

