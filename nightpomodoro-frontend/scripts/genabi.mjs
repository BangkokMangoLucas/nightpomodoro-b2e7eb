#!/usr/bin/env node

/**
 * Generate ABI and contract addresses from Hardhat deployments
 * Similar to frontend/scripts/genabi.mjs but for NightPomodoro contracts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = join(__dirname, "../..");
const DEPLOYMENTS_DIR = join(ROOT_DIR, "fhevm-hardhat-template/deployments");
const OUTPUT_DIR = join(__dirname, "../abi");

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Contract names to extract
const CONTRACTS = ["PomodoroCore", "PomodoroNFT"];

// Networks to support
const NETWORKS = ["localhost", "sepolia"];

console.log("🔧 Generating ABIs and addresses...\n");

// Generate ABI files
for (const contract of CONTRACTS) {
  try {
    // Find deployment file from any network
    let abi = null;
    for (const network of NETWORKS) {
      const deploymentPath = join(DEPLOYMENTS_DIR, network, `${contract}.json`);
      if (existsSync(deploymentPath)) {
        const deploymentData = JSON.parse(readFileSync(deploymentPath, "utf8"));
        abi = deploymentData.abi;
        console.log(`✓ Found ${contract} ABI from ${network}`);
        break;
      }
    }

    if (!abi) {
      console.warn(`⚠ ${contract} not deployed on any network, skipping...`);
      continue;
    }

    // Write ABI file
    const abiContent = `// Auto-generated ABI for ${contract}
// Do not edit manually

export const ${contract}ABI = ${JSON.stringify(abi, null, 2)} as const;

export type ${contract}ABI = typeof ${contract}ABI;
`;

    writeFileSync(join(OUTPUT_DIR, `${contract}ABI.ts`), abiContent);
    console.log(`✓ Generated ${contract}ABI.ts`);
  } catch (error) {
    console.error(`✗ Error processing ${contract}:`, error.message);
  }
}

// Generate addresses file
try {
  const addresses = {};

  for (const network of NETWORKS) {
    addresses[network] = {};
    for (const contract of CONTRACTS) {
      const deploymentPath = join(DEPLOYMENTS_DIR, network, `${contract}.json`);
      if (existsSync(deploymentPath)) {
        const deploymentData = JSON.parse(readFileSync(deploymentPath, "utf8"));
        addresses[network][contract] = deploymentData.address;
      }
    }
  }

  const addressContent = `// Auto-generated contract addresses
// Do not edit manually

export interface ContractAddresses {
  PomodoroCore?: string;
  PomodoroNFT?: string;
}

export interface NetworkAddresses {
  localhost: ContractAddresses;
  sepolia: ContractAddresses;
}

export const contractAddresses: NetworkAddresses = ${JSON.stringify(
    addresses,
    null,
    2
  )};

// Helper to get contract address for current network
export function getContractAddress(
  chainId: number,
  contractName: keyof ContractAddresses
): string | undefined {
  const networkMap: Record<number, keyof NetworkAddresses> = {
    31337: "localhost",
    11155111: "sepolia",
  };

  const network = networkMap[chainId];
  if (!network) return undefined;

  return contractAddresses[network][contractName];
}

// Helper to check if contracts are deployed on network
export function areContractsDeployed(chainId: number): boolean {
  const networkMap: Record<number, keyof NetworkAddresses> = {
    31337: "localhost",
    11155111: "sepolia",
  };

  const network = networkMap[chainId];
  if (!network) return false;

  const addresses = contractAddresses[network];
  return Boolean(addresses.PomodoroCore && addresses.PomodoroNFT);
}
`;

  writeFileSync(join(OUTPUT_DIR, "ContractAddresses.ts"), addressContent);
  console.log("✓ Generated ContractAddresses.ts");
} catch (error) {
  console.error("✗ Error generating addresses:", error.message);
}

console.log("\n✅ ABI generation complete!");

