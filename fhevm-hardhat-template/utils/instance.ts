import { ethers } from "hardhat";
import crypto from "crypto";

// Mock FHEVM instance for testing
export interface FhevmInstance {
  getPublicKey: () => string;
  encrypt32: (value: number) => Uint8Array;
  encrypt64: (value: bigint) => Uint8Array;
}

export async function createFhevmInstance(): Promise<FhevmInstance> {
  // Generate a mock public key (in real scenario, this comes from KMS)
  const publicKey = crypto.randomBytes(32).toString("hex");

  return {
    getPublicKey: () => publicKey,
    
    // Mock encryption: in real tests, use @fhevm/tfhe or mock-utils
    encrypt32: (value: number) => {
      // Simple mock: prepend type byte and encode value
      const buffer = Buffer.alloc(33);
      buffer.writeUInt8(0x00, 0); // Type marker for euint32
      buffer.writeUInt32BE(value, 29);
      return new Uint8Array(buffer);
    },

    encrypt64: (value: bigint) => {
      const buffer = Buffer.alloc(41);
      buffer.writeUInt8(0x01, 0); // Type marker for euint64
      buffer.writeBigUInt64BE(value, 33);
      return new Uint8Array(buffer);
    },
  };
}

// Helper to create encrypted input proof (mock)
export function createInputProof(encryptedData: Uint8Array): Uint8Array {
  // In production, this would be a ZK proof
  // For mock, just return the data
  return encryptedData;
}

