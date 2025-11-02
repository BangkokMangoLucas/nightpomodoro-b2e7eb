/**
 * FHEVM Type Definitions
 */

export interface FhevmInstance {
  // Encryption
  createEncryptedInput(contractAddress: string, userAddress: string): EncryptedInput;
  
  // Decryption
  generateKeypair(): { privateKey: string; publicKey: string };
  createEIP712(publicKey: string, contractAddresses: string[], startTimestamp: number, durationDays: number): EIP712Data;
  userDecrypt(
    handles: Array<{ handle: string; contractAddress: string }>,
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: string[],
    userAddress: string,
    startTimestamp: number,
    durationDays: number
  ): Promise<Record<string, bigint>>;
  
  // Utilities
  getPublicKey(): string;
  getPublicParams(size: number): string;
}

export interface EncryptedInput {
  add8(value: number): EncryptedInput;
  add16(value: number): EncryptedInput;
  add32(value: number): EncryptedInput;
  add64(value: number | bigint): EncryptedInput;
  addBool(value: boolean): EncryptedInput;
  addAddress(address: string): EncryptedInput;
  encrypt(): Promise<EncryptedData>;
}

export interface EncryptedData {
  handles: string[];
  inputProof: string;
}

export interface EIP712Data {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    Reencrypt: Array<{ name: string; type: string }>;
  };
  message: {
    publicKey: string;
    signature: string;
  };
}

export interface FhevmInstanceConfig {
  network: string | any;
  publicKey: string;
  publicParams: string;
  aclContractAddress: string;
  kmsVerifierContractAddress: string;
}

