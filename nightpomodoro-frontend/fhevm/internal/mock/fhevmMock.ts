//////////////////////////////////////////////////////////////////////////
//
// WARNING!!
// ALWAY USE DYNAMICALLY IMPORT THIS FILE TO AVOID INCLUDING THE ENTIRE 
// FHEVM MOCK LIB IN THE FINAL PRODUCTION BUNDLE!!
//
//////////////////////////////////////////////////////////////////////////

import { JsonRpcProvider } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";
import type { FhevmInstance } from "../fhevmTypes";

/**
 * Fetch FHEVM metadata from local Hardhat node
 */
async function getFHEVMRelayerMetadata(rpcUrl: string): Promise<{
  ACLAddress: `0x${string}`;
  InputVerifierAddress: `0x${string}`;
  KMSVerifierAddress: `0x${string}`;
}> {
  const provider = new JsonRpcProvider(rpcUrl);
  try {
    const metadata = await provider.send("fhevm_relayer_metadata", []);
    return metadata;
  } catch (error) {
    throw new Error(
      `Failed to fetch FHEVM metadata from ${rpcUrl}. Is the Hardhat node running with FHEVM?`
    );
  } finally {
    provider.destroy();
  }
}

/**
 * Query contract EIP712 domain
 */
async function getContractEIP712Domain(
  provider: JsonRpcProvider,
  contractAddress: string
): Promise<{
  chainId: bigint;
  verifyingContract: string;
  version: string;
  name: string;
}> {
  const contract = new (await import("ethers")).Contract(
    contractAddress,
    ["function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])"],
    provider
  );
  const domain = await contract.eip712Domain();
  return {
    chainId: domain[3], // uint256
    verifyingContract: domain[4], // address
    version: domain[2], // string
    name: domain[1], // string
  };
}

/**
 * Create mock FHEVM instance for localhost
 */
export async function createFhevmMockInstance(
  chainId: number,
  rpcUrl: string = "http://localhost:8545"
): Promise<FhevmInstance> {
  // Fetch metadata from local Hardhat node
  const metadata = await getFHEVMRelayerMetadata(rpcUrl);

  // Create provider
  const provider = new JsonRpcProvider(rpcUrl);

  // Query EIP712 domains from contracts
  const [kmsVerifierDomain, inputVerifierDomain] = await Promise.all([
    getContractEIP712Domain(provider, metadata.KMSVerifierAddress),
    getContractEIP712Domain(provider, metadata.InputVerifierAddress),
  ]);

  console.log("Contract EIP712 domains:", {
    kmsVerifier: {
      chainId: kmsVerifierDomain.chainId.toString(),
      verifyingContract: kmsVerifierDomain.verifyingContract,
      version: kmsVerifierDomain.version,
      name: kmsVerifierDomain.name,
    },
    inputVerifier: {
      chainId: inputVerifierDomain.chainId.toString(),
      verifyingContract: inputVerifierDomain.verifyingContract,
      version: inputVerifierDomain.version,
      name: inputVerifierDomain.name,
    },
  });

  // Create mock instance using MockFhevmInstance.create (v0.3.0 API)
  // Use actual EIP712 domain values from contracts
  const instance = await MockFhevmInstance.create(
    provider, 
    provider, 
    {
      aclContractAddress: metadata.ACLAddress,
      chainId: chainId,
      gatewayChainId: Number(kmsVerifierDomain.chainId), // Use actual chainId from KMSVerifier
      inputVerifierContractAddress: metadata.InputVerifierAddress,
      kmsContractAddress: metadata.KMSVerifierAddress,
      // Use actual verifyingContract from contracts' EIP712 domains
      verifyingContractAddressDecryption: kmsVerifierDomain.verifyingContract as `0x${string}`,
      verifyingContractAddressInputVerification: inputVerifierDomain.verifyingContract as `0x${string}`,
    },
    {
      // v0.3.0 requires 4th parameter: properties
      inputVerifierProperties: {},
      kmsVerifierProperties: {},
    }
  );
  
  // Debug: Log instance configuration
  console.log("MockFhevmInstance created:", {
    chainId,
    gatewayChainId: Number(kmsVerifierDomain.chainId),
    kmsContractAddress: metadata.KMSVerifierAddress,
    verifyingContractAddressDecryption: kmsVerifierDomain.verifyingContract,
    verifyingContractAddressInputVerification: inputVerifierDomain.verifyingContract,
  });

  // Wrap instance with proper type casting
  const wrappedInstance = {
    createEncryptedInput(contractAddress: string, userAddress: string) {
      const input = instance.createEncryptedInput(contractAddress, userAddress);
      
      // Wrap encrypt method to convert Uint8Array to string
      const originalEncrypt = input.encrypt.bind(input);
      (input as any).encrypt = async () => {
        const result = await originalEncrypt();
        return {
          handles: result.handles.map((h: Uint8Array) => "0x" + Buffer.from(h).toString("hex")),
          inputProof: "0x" + Buffer.from(result.inputProof).toString("hex"),
        };
      };
      
      return input as any;
    },
    
    generateKeypair: () => instance.generateKeypair(),
    createEIP712: (publicKey: string, contractAddresses: string[], startTimestamp: number, durationDays: number) => {
      try {
        const eip712 = instance.createEIP712(publicKey, contractAddresses, startTimestamp, durationDays);
        console.log("createEIP712 success");
        return eip712;
      } catch (error) {
        console.error("createEIP712 failed:", error);
        console.error("Parameters:", { publicKey, contractAddresses, startTimestamp, durationDays });
        // The error is likely due to EIP712 domain mismatch
        // This usually means the KMSVerifier contract's EIP712 domain doesn't match the expected configuration
        throw error;
      }
    },
    getPublicKey: () => "0x" + "00".repeat(32),
    getPublicParams: (size: number) => instance.getPublicParams(size as any),
    
    userDecrypt: async (
      requests: any[],
      privateKey: string,
      publicKey: string,
      signature: string,
      contractAddresses: `0x${string}`[],
      userAddress: string,
      startTimestamp: number,
      durationDays: number
    ) => {
      // Delegate to MockFhevmInstance's userDecrypt
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
  
  return wrappedInstance as unknown as FhevmInstance;
}

